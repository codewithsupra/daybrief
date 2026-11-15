import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { AttentionCategory } from "@/db/schema";
import { aiConfigured, generateObject } from "./ai";

const CATS = ["work_learning", "creator", "entertainment", "social", "news", "shopping", "other"] as const;

const domainSchema = z.object({
  domains: z.array(z.object({ domain: z.string(), category: z.enum(CATS) })),
});

/**
 * Give a category to domains the rules didn't recognise. Answers are cached for everyone,
 * so each domain is sent to the model once. Only domain names are sent, never page titles.
 */
export async function resolveUnknownDomains(userId: string, days: string[]): Promise<number> {
  const db = await getDb();
  const e = schema.browseEvents;
  const rows = await db
    .selectDistinct({ domain: e.domain })
    .from(e)
    .where(and(eq(e.userId, userId), eq(e.category, "other"), inArray(e.day, days)));
  const domains = rows.map((r) => r.domain).filter(Boolean);
  if (domains.length === 0) return 0;

  const cached = await db
    .select()
    .from(schema.domainCategories)
    .where(inArray(schema.domainCategories.domain, domains));
  const known = new Map<string, AttentionCategory>(cached.map((c) => [c.domain, c.category]));

  const unknown = domains.filter((d) => !known.has(d)).slice(0, 80);
  if (unknown.length > 0 && aiConfigured()) {
    try {
      const out = await generateObject({
        model: "fast",
        schema: domainSchema,
        system:
          "Classify each website domain by what people mostly do there. work_learning: tools, docs, courses, reference. creator: publishing or making content. Use other when unsure.",
        prompt: JSON.stringify(unknown),
      });
      const wanted = new Set(unknown);
      for (const r of out.domains) {
        if (!wanted.has(r.domain)) continue;
        known.set(r.domain, r.category);
        await db.insert(schema.domainCategories).values(r).onConflictDoNothing();
      }
    } catch (err) {
      console.error("domain classification failed", err);
    }
  }

  let updated = 0;
  for (const [domain, category] of known) {
    if (category === "other") continue;
    await db
      .update(e)
      .set({ category })
      .where(and(eq(e.userId, userId), eq(e.domain, domain), eq(e.category, "other")));
    updated++;
  }
  return updated;
}
