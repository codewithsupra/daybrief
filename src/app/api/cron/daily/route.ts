import { getDb, schema } from "@/db";
import { runDaily } from "@/lib/run-daily";

export const maxDuration = 300;

/** Called by Vercel Cron each morning. Builds and emails every user's plan. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const db = await getDb();
  const users = await db.select({ id: schema.users.id }).from(schema.users);
  const results = [];
  for (const u of users) {
    try {
      results.push({ user: u.id, ...(await runDaily(u.id, { email: true })) });
    } catch (err) {
      results.push({ user: u.id, error: (err as Error).message });
    }
  }
  return Response.json({ results });
}
