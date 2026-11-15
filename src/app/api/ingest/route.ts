import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sha256 } from "@/lib/crypto";
import { DEFAULT_BLOCKLIST } from "@/lib/defaults";
import { cleanEvents, ingestSchema } from "@/lib/ingest";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

async function userFromToken(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.extensionTokens)
    .where(eq(schema.extensionTokens.tokenHash, sha256(token)));
  if (!row) return null;
  await db
    .update(schema.extensionTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.extensionTokens.id, row.id));
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, row.userId));
  return user ?? null;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

/** The extension reads the blocklist here so blocked sites never leave the browser. */
export async function GET(req: Request) {
  const user = await userFromToken(req);
  if (!user) return json({ error: "invalid token" }, 401);
  return json({ blocklist: [...DEFAULT_BLOCKLIST, ...user.blocklist] });
}

export async function POST(req: Request) {
  const user = await userFromToken(req);
  if (!user) return json({ error: "invalid token" }, 401);
  const parsed = ingestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid payload" }, 400);

  const clean = cleanEvents(parsed.data.events, [...DEFAULT_BLOCKLIST, ...user.blocklist]);
  if (clean.length === 0) return json({ stored: 0 });

  const db = await getDb();
  // Reuse categories the model already assigned to domains the rules don't know.
  const unknown = [...new Set(clean.filter((e) => e.category === "other").map((e) => e.domain))];
  if (unknown.length > 0) {
    const cached = await db
      .select()
      .from(schema.domainCategories)
      .where(inArray(schema.domainCategories.domain, unknown));
    const map = new Map(cached.map((c) => [c.domain, c.category]));
    for (const e of clean) if (e.category === "other" && map.has(e.domain)) e.category = map.get(e.domain)!;
  }
  await db.insert(schema.browseEvents).values(clean.map((e) => ({ ...e, userId: user.id })));
  return json({ stored: clean.length });
}
