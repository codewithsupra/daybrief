import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { DEFAULT_GOALS } from "../src/lib/defaults";

/** Same as ensureUser in src/auth.ts, without pulling Auth.js into a script. */
export async function ensureUserRow(email: string, name: string, timezone: string): Promise<string> {
  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return existing.id;
  const [created] = await db.insert(schema.users).values({ email, name, timezone }).returning();
  await db.insert(schema.goals).values(DEFAULT_GOALS.map((g, position) => ({ ...g, position, userId: created.id })));
  return created.id;
}
