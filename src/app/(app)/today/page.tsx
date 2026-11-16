import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { AttentionPanel, SitesPanel, StatTiles, WaitingPanel } from "@/components/dashboard-panels";
import { summarizeDay, topSites } from "@/lib/attention";
import { lastDays, shiftDay } from "@/lib/days";
import { loadInbox } from "@/lib/inbox";
import { sourceUrl } from "@/lib/planner";
import { requireUser } from "@/lib/user";
import { buildPlanAction, prepareDraftAction, setItemStatus } from "../actions";

function SetStatus({
  id,
  status,
  children,
  className,
  label,
}: {
  id: string;
  status: string;
  children?: React.ReactNode;
  className: string;
  label?: string;
}) {
  return (
    <form action={setItemStatus} className="flex">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={className} aria-label={label}>
        {children}
      </button>
    </form>
  );
}

const STATUS_LABEL = { done: "Done", snoozed: "Later", dismissed: "Hidden", open: "" } as const;

export default async function Dashboard() {
  const { db, user, today } = await requireUser();
  const yesterday = shiftDay(today, -1);
  const days = lastDays(today, 7);

  const [plan] = await db
    .select()
    .from(schema.dailyPlans)
    .where(and(eq(schema.dailyPlans.userId, user.id), eq(schema.dailyPlans.day, today)));
  const items = plan
    ? await db
        .select()
        .from(schema.planItems)
        .where(eq(schema.planItems.planId, plan.id))
        .orderBy(schema.planItems.position)
    : [];
  const inbox = await loadInbox(user.id);
  const events = await db
    .select()
    .from(schema.browseEvents)
    .where(and(eq(schema.browseEvents.userId, user.id), inArray(schema.browseEvents.day, days)));

  const summaries = days.map((d) => summarizeDay(d, events));
  const yday = summaries.find((s) => s.day === yesterday)!;
  const weekMinutes = summaries.reduce((n, s) => n + s.totalMinutes, 0);
  const sites = topSites(
    events.filter((e) => e.day === yesterday),
    5,
  );

  const open = items.filter((i) => i.status === "open");
  const closed = items.filter((i) => i.status !== "open");
  const done = items.filter((i) => i.status === "done").length;
  const remaining = open.reduce((sum, i) => sum + i.minutes, 0);
  const waiting = inbox.filter((r) => r.category === "needs_reply");
  const deadlines = inbox.filter((r) => r.category === "deadline");

  const date = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="t-page">Dashboard</h1>
        <span className="text-muted">{date}</span>
        <div className="ml-auto">
          <ActionForm
            action={buildPlanAction}
            label={plan ? "Refresh" : "Build today's plan"}
            pendingLabel="Working…"
            className={plan ? "btn" : "btn btn-primary"}
          />
        </div>
      </div>

      <StatTiles
        hasPlan={!!plan}
        planTotal={items.length}
        planDone={done}
        openCount={open.length}
        remainingMinutes={remaining}
        waitingCount={waiting.length}
        deadlineCount={deadlines.length}
        yesterday={yday}
        weekMinutes={weekMinutes}
        inboxHref="/inbox"
        attentionHref="/attention"
      />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="panel min-w-0 self-start">
          <div className="panel-head">
            <h2 className="t-section">Today&apos;s plan</h2>
            {plan?.source === "fallback" && (
              <span className="pill" style={{ "--pill": "var(--warn)" } as React.CSSProperties}>
                Basic mode
              </span>
            )}
          </div>
          {!plan ? (
            <p className="px-3.5 py-4 text-muted">
              No plan yet. Build one from your inbox and yesterday&apos;s browsing; it also runs each morning.
            </p>
          ) : (
            <>
              <p className="border-b border-line px-3.5 py-2.5 text-[13px] text-muted">{plan.summary}</p>
              {open.length === 0 && <p className="px-3.5 py-3 text-muted">Everything on today&apos;s plan is handled.</p>}
              <ul>
                {open.map((item) => {
                  const url = sourceUrl(item);
                  return (
                    <li key={item.id} className="row flex gap-2.5 px-3.5 py-2.5">
                      <SetStatus id={item.id} status="done" className="check" label={`Mark done: ${item.title}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-3">
                          <p className="min-w-0 flex-1 font-medium">{item.title}</p>
                          <span className="t-small shrink-0 tabular-nums text-faint">{item.minutes}m</span>
                        </div>
                        <p className="text-[13px] text-muted">{item.why}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {url && (
                            <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">
                              {item.sourceType === "email" ? "Open email" : "Open link"}
                            </a>
                          )}
                          {item.sourceType === "email" && item.sourceRef && (
                            <ActionForm
                              action={prepareDraftAction}
                              label="Draft reply"
                              pendingLabel="Drafting…"
                              className="btn btn-sm"
                            >
                              <input type="hidden" name="threadId" value={item.sourceRef} />
                            </ActionForm>
                          )}
                          <SetStatus id={item.id} status="snoozed" className="btn btn-sm btn-ghost">
                            Later
                          </SetStatus>
                          <SetStatus id={item.id} status="dismissed" className="btn btn-sm btn-ghost">
                            Hide
                          </SetStatus>
                          {item.goal && <span className="pill ml-auto">{item.goal}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {closed.map((item) => (
                  <li key={item.id} className="row flex items-center gap-2.5 px-3.5 py-1.5 text-[13px] text-faint">
                    <span className="t-small w-11 shrink-0">{STATUS_LABEL[item.status]}</span>
                    <span className={`min-w-0 flex-1 truncate ${item.status === "done" ? "line-through" : ""}`}>
                      {item.title}
                    </span>
                    <SetStatus id={item.id} status="open" className="btn btn-sm btn-ghost">
                      Undo
                    </SetStatus>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 self-start">
          <AttentionPanel
            summaries={summaries}
            weekMinutes={weekMinutes}
            href="/attention"
            basePath="/attention"
            empty={
              <>
                No browsing recorded yet. Connect the Chrome extension in{" "}
                <a href="/settings" className="text-accent hover:underline">
                  Settings
                </a>
                .
              </>
            }
          />
          <WaitingPanel
            waiting={waiting}
            inboxHref="/inbox"
            threadHref={(r) => `https://mail.google.com/mail/u/0/#all/${r.threadId}`}
          />
          <SitesPanel sites={sites} />
        </div>
      </div>
    </div>
  );
}
