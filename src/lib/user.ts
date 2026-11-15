import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { dayInZone } from "./days";
import { requireUserId } from "./session";

/** The signed-in user row plus today's date in their timezone. */
export async function requireUser() {
  const userId = await requireUserId();
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  return { db, user, today: dayInZone(new Date(), user.timezone) };
}
