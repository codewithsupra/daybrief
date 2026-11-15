import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { PlanMetrics } from "@/db/schema";
import { summarizeDay, topSites, topVideos } from "./attention";
import { dayInZone, shiftDay } from "./days";
import { resolveUnknownDomains } from "./domains";
import { syncGmail } from "./gmail-sync";
import { renderPlanEmail, sendPlanEmail } from "./plan-email";
import { draftPlan, type PlanContext, type PlanThread } from "./planner";
import { triagePending } from "./triage";

/** Where links in the morning email point: an explicit APP_URL, else the Vercel production domain. */
function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

export type RunResult = {
  day: string;
  synced: number;
  triaged: number;
  items: number;
  emailed: boolean;
  source: "model" | "fallback";
  warnings: string[];
};

/** Sync mail and triage it. Safe to call often; failures are returned, not thrown. */
export async function refreshInbox(userId: string, today: string) {
  const warnings: string[] = [];
  let synced = 0;
  let triaged = 0;
  try {
    synced = await syncGmail(userId);
  } catch (err) {
    warnings.push(`Gmail sync: ${(err as Error).message}`);
  }
  try {
    triaged = await triagePending(userId, today);
  } catch (err) {
    warnings.push(`Triage: ${(err as Error).message}`);
  }
  return { synced, triaged, warnings };
}

export async function buildContext(userId: string, today: string): Promise<PlanContext> {
  const db = await getDb();
  const yesterday = shiftDay(today, -1);

  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId))
    .orderBy(schema.goals.position);

  const t = schema.emailThreads;
  const rows = await db
    .select()
    .from(t)
    .where(
      and(
        eq(t.userId, userId),
        inArray(t.category, ["needs_reply", "deadline", "waiting"]),
        gte(t.lastMessageAt, new Date(Date.now() - 21 * 86400_000)),
      ),
    )
    .orderBy(desc(t.lastMessageAt))
    .limit(60);
  const now = Date.now();
  const threads: PlanThread[] = rows
    .map((r) => ({
      threadId: r.threadId,
      subject: r.subject,
      fromName: r.fromName,
      category: r.category as string,
      reason: r.reason ?? "",
      dueDate: r.dueDate,
      daysOld: Math.floor((now - r.lastMessageAt.getTime()) / 86400_000),
    }))
    // "Waiting" only matters once it has gone quiet for a few days.
    .filter((r) => r.category !== "waiting" || r.daysOld >= 3)
    .slice(0, 25);

  const events = await db
    .select()
    .from(schema.browseEvents)
    .where(and(eq(schema.browseEvents.userId, userId), eq(schema.browseEvents.day, yesterday)));
  const summary = summarizeDay(yesterday, events);
  const metrics: PlanMetrics = {
    totalMinutes: summary.totalMinutes,
    alignedPct: summary.alignedPct,
    byCategory: summary.byCategory,
    needsReply: rows.filter((r) => r.category === "needs_reply").length,
    deadlines: rows.filter((r) => r.category === "deadline").length,
  };

  const p = schema.dailyPlans;
  const i = schema.planItems;
  const history = await db
    .select({ title: i.title, status: i.status, day: p.day })
    .from(i)
    .innerJoin(p, eq(i.planId, p.id))
    .where(and(eq(i.userId, userId), gte(p.day, shiftDay(today, -7))))
    .orderBy(desc(p.day))
    .limit(60);

  return {
    today,
    goals: goals.map((g) => ({ title: g.title, detail: g.detail })),
    threads,
    metrics,
    topSites: topSites(events, 6),
    topVideos: topVideos(events, 6),
    history: history.filter((h) => h.day !== today),
  };
}

/**
 * The morning run for one user: sync, triage, build the plan, store it, email it.
 * Re-running on the same day replaces that day's plan; the email goes out once.
 */
export async function runDaily(userId: string, opts: { email?: boolean } = {}): Promise<RunResult> {
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new Error("user not found");
  const today = dayInZone(new Date(), user.timezone);

  const inbox = await refreshInbox(userId, today);
  const warnings = [...inbox.warnings];
  await resolveUnknownDomains(userId, [shiftDay(today, -1), today]).catch((err) =>
    warnings.push(`Domains: ${(err as Error).message}`),
  );

  const ctx = await buildContext(userId, today);
  const plan = await draftPlan(ctx);

  const p = schema.dailyPlans;
  const [existing] = await db.select().from(p).where(and(eq(p.userId, userId), eq(p.day, today)));
  let planId: string;
  if (existing) {
    planId = existing.id;
    await db
      .update(p)
      .set({ summary: plan.summary, metrics: ctx.metrics, source: plan.source })
      .where(eq(p.id, planId));
    await db.delete(schema.planItems).where(eq(schema.planItems.planId, planId));
  } else {
    const [created] = await db
      .insert(p)
      .values({ userId, day: today, summary: plan.summary, metrics: ctx.metrics, source: plan.source })
      .returning();
    planId = created.id;
  }
  if (plan.items.length > 0) {
    await db
      .insert(schema.planItems)
      .values(plan.items.map((item, position) => ({ ...item, planId, userId, position })));
  }

  let emailed = false;
  if (opts.email && user.morningEmail && !existing?.emailedAt) {
    try {
      emailed = await sendPlanEmail(
        user.email,
        renderPlanEmail({
          day: today,
          summary: plan.summary,
          items: plan.items,
          metrics: ctx.metrics,
          appUrl: appUrl(),
        }),
      );
      if (emailed) await db.update(p).set({ emailedAt: new Date() }).where(eq(p.id, planId));
    } catch (err) {
      warnings.push(`Email: ${(err as Error).message}`);
    }
  }

  return {
    day: today,
    synced: inbox.synced,
    triaged: inbox.triaged,
    items: plan.items.length,
    emailed,
    source: plan.source,
    warnings,
  };
}
