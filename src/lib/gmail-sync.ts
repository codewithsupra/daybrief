import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { accessTokenFor, gmail } from "./google";
import { syncQuery, threadToRow, type GmailThread } from "./gmail-parse";

const MAX_THREADS = 200;
const CONCURRENCY = 8;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** Pull threads changed since the last sync and upsert one row per thread. Returns the count. */
export async function syncGmail(userId: string): Promise<number> {
  const db = await getDb();
  const [account] = await db
    .select()
    .from(schema.googleAccounts)
    .where(eq(schema.googleAccounts.userId, userId));
  if (!account) return 0;

  const startedAt = new Date();
  const token = await accessTokenFor(userId);
  const q = encodeURIComponent(syncQuery(account.lastSyncAt, startedAt));

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await gmail<{ threads?: { id: string }[]; nextPageToken?: string }>(
      token,
      `/threads?q=${q}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`,
    );
    ids.push(...(page.threads ?? []).map((t) => t.id));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < MAX_THREADS);

  const threads = await mapLimit(ids.slice(0, MAX_THREADS), CONCURRENCY, (id) =>
    gmail<GmailThread>(
      token,
      `/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
    ),
  );

  let count = 0;
  for (const thread of threads) {
    const row = threadToRow(thread);
    if (!row) continue;
    await db
      .insert(schema.emailThreads)
      .values({ userId, ...row })
      .onConflictDoUpdate({
        target: [schema.emailThreads.userId, schema.emailThreads.threadId],
        set: row,
      });
    count++;
  }

  await db
    .update(schema.googleAccounts)
    .set({ lastSyncAt: startedAt })
    .where(eq(schema.googleAccounts.userId, userId));
  return count;
}
