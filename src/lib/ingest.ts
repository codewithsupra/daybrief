import { z } from "zod";
import type { AttentionCategory } from "@/db/schema";
import { domainOf, isBlocked, ruleCategory, sanitizeUrl } from "./categorize";

export const ingestSchema = z.object({
  events: z
    .array(
      z.object({
        url: z.string().max(2000),
        title: z.string().max(500).default(""),
        startedAt: z.number().int().positive(),
        durationSec: z.number().int().positive(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        channel: z.string().max(200).nullish(),
      }),
    )
    .max(500),
});

export type IngestEvent = z.infer<typeof ingestSchema>["events"][number];

export type CleanEvent = {
  day: string;
  startedAt: Date;
  durationSec: number;
  url: string;
  domain: string;
  title: string;
  category: AttentionCategory;
  videoId: string | null;
  channel: string | null;
};

const MIN_SECONDS = 5;
const MAX_SECONDS = 4 * 3600;

/** Validate, strip and categorise raw extension events. Blocked or trivial ones are dropped. */
export function cleanEvents(events: IngestEvent[], blocklist: string[]): CleanEvent[] {
  const out: CleanEvent[] = [];
  for (const e of events) {
    if (e.durationSec < MIN_SECONDS) continue;
    const url = sanitizeUrl(e.url);
    if (!url) continue;
    const domain = domainOf(url);
    if (!domain || isBlocked(domain, blocklist)) continue;
    const videoId = domain.endsWith("youtube.com") ? new URL(url).searchParams.get("v") : null;
    const title = e.title.replace(/^\(\d+\)\s*/, "").replace(/\s+-\s+YouTube$/, "").trim();
    out.push({
      day: e.day,
      startedAt: new Date(e.startedAt),
      durationSec: Math.min(e.durationSec, MAX_SECONDS),
      url,
      domain,
      title,
      category: ruleCategory(domain, title) ?? "other",
      videoId,
      channel: videoId ? (e.channel?.trim() || null) : null,
    });
  }
  return out;
}
