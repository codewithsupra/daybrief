import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type InboxRow = typeof schema.emailThreads.$inferSelect & { daysOld: number };

/** Threads from the last three weeks that need something from the user, newest first. */
export async function loadInbox(userId: string): Promise<InboxRow[]> {
  const db = await getDb();
  const t = schema.emailThreads;
  const now = Date.now();
  const rows = await db
    .select()
    .from(t)
    .where(
      and(
        eq(t.userId, userId),
        inArray(t.category, ["needs_reply", "deadline", "waiting"]),
        gte(t.lastMessageAt, new Date(now - 21 * 86400_000)),
      ),
    )
    .orderBy(desc(t.lastMessageAt));
  return rows.map((r) => ({ ...r, daysOld: Math.floor((now - r.lastMessageAt.getTime()) / 86400_000) }));
}
