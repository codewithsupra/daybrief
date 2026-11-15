import type { AttentionCategory } from "@/db/schema";
import { ALIGNED } from "./categorize";

export type AttentionEvent = {
  day: string;
  durationSec: number;
  domain: string;
  title: string;
  url: string;
  category: AttentionCategory;
  videoId?: string | null;
  channel?: string | null;
};

export type DaySummary = {
  day: string;
  totalMinutes: number;
  alignedPct: number;
  byCategory: Partial<Record<AttentionCategory, number>>;
};

export type Ranked = { label: string; minutes: number; category: AttentionCategory; url?: string };

const toMinutes = (sec: number) => Math.round((sec / 60) * 10) / 10;

export function summarizeDay(day: string, events: AttentionEvent[]): DaySummary {
  const seconds: Partial<Record<AttentionCategory, number>> = {};
  let total = 0;
  let aligned = 0;
  for (const e of events) {
    if (e.day !== day) continue;
    seconds[e.category] = (seconds[e.category] ?? 0) + e.durationSec;
    total += e.durationSec;
    if (ALIGNED.includes(e.category)) aligned += e.durationSec;
  }
  const byCategory: DaySummary["byCategory"] = {};
  for (const [k, v] of Object.entries(seconds)) byCategory[k as AttentionCategory] = toMinutes(v);
  return {
    day,
    totalMinutes: toMinutes(total),
    alignedPct: total === 0 ? 0 : Math.round((aligned / total) * 100),
    byCategory,
  };
}

function rank(
  events: AttentionEvent[],
  keyOf: (e: AttentionEvent) => { key: string; label: string; url?: string } | null,
  limit: number,
): Ranked[] {
  const map = new Map<string, Ranked & { sec: number }>();
  for (const e of events) {
    const k = keyOf(e);
    if (!k) continue;
    const cur = map.get(k.key) ?? { label: k.label, minutes: 0, category: e.category, url: k.url, sec: 0 };
    cur.sec += e.durationSec;
    map.set(k.key, cur);
  }
  return [...map.values()]
    .sort((a, b) => b.sec - a.sec)
    .slice(0, limit)
    .map(({ sec, ...r }) => ({ ...r, minutes: toMinutes(sec) }));
}

export const topSites = (events: AttentionEvent[], limit = 8) =>
  rank(events, (e) => ({ key: e.domain, label: e.domain }), limit);

export const topVideos = (events: AttentionEvent[], limit = 8) =>
  rank(
    events,
    (e) =>
      e.videoId
        ? {
            key: e.videoId,
            label: e.channel ? `${e.title} — ${e.channel}` : e.title,
            url: `https://www.youtube.com/watch?v=${e.videoId}`,
          }
        : null,
    limit,
  );

export const topPages = (events: AttentionEvent[], limit = 8) =>
  rank(events, (e) => (e.videoId ? null : { key: e.url, label: e.title || e.url, url: e.url }), limit);
