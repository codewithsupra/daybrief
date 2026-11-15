import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { currentUserId } from "@/lib/session";

/** Everything stored about the signed-in user, as one JSON file. Tokens are left out. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  const data = {
    exportedAt: new Date().toISOString(),
    user,
    goals: await db.select().from(schema.goals).where(eq(schema.goals.userId, userId)),
    emailThreads: await db.select().from(schema.emailThreads).where(eq(schema.emailThreads.userId, userId)),
    browseEvents: await db.select().from(schema.browseEvents).where(eq(schema.browseEvents.userId, userId)),
    dailyPlans: await db.select().from(schema.dailyPlans).where(eq(schema.dailyPlans.userId, userId)),
    planItems: await db.select().from(schema.planItems).where(eq(schema.planItems.userId, userId)),
    emailDrafts: await db.select().from(schema.emailDrafts).where(eq(schema.emailDrafts.userId, userId)),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="daybrief-export.json"`,
    },
  });
}
