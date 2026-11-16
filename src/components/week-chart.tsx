import type { AttentionCategory } from "@/db/schema";
import type { DaySummary } from "@/lib/attention";
import { CATEGORY_LABELS } from "@/lib/categorize";
import { formatMinutes } from "@/lib/days";

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as AttentionCategory[];
export const categoryColor = (c: AttentionCategory) => `var(--c-${c})`;

const weekday = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

/** Seven stacked bars, one per day, each linking to that day's detail. */
export function WeekChart({
  summaries,
  selected,
  height = 128,
  basePath = "/attention",
}: {
  summaries: DaySummary[];
  selected?: string;
  height?: number;
  /** Page each bar links to, as `basePath?day=YYYY-MM-DD`. */
  basePath?: string;
}) {
  const peak = Math.max(1, ...summaries.map((s) => s.totalMinutes));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }} role="list" aria-label="Time per day by category">
        {summaries.map((s) => (
          <a
            key={s.day}
            role="listitem"
            href={`${basePath}?day=${s.day}`}
            aria-label={`${weekday(s.day)} ${s.day}: ${formatMinutes(s.totalMinutes)}, ${s.alignedPct}% on goals`}
            aria-current={s.day === selected ? "true" : undefined}
            className={`flex h-full min-w-0 flex-1 flex-col justify-end rounded-lg px-1 pb-1 ${
              s.day === selected ? "bg-raised" : "hover:bg-raised"
            }`}
          >
            <div className="t-small text-center tabular-nums text-faint">
              {s.totalMinutes ? formatMinutes(s.totalMinutes) : ""}
            </div>
            <div
              className="flex flex-col-reverse gap-0.5 overflow-hidden rounded"
              style={{ height: `${(s.totalMinutes / peak) * 70}%` }}
            >
              {CATEGORY_ORDER.map((c) =>
                s.byCategory[c] ? (
                  <div key={c} style={{ flexGrow: s.byCategory[c], background: categoryColor(c) }} />
                ) : null,
              )}
            </div>
            <div className={`t-small pt-1 text-center ${s.day === selected ? "font-semibold text-ink" : "text-muted"}`}>
              {weekday(s.day)}
            </div>
          </a>
        ))}
      </div>
      <ul className="t-small mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted">
        {CATEGORY_ORDER.filter((c) => summaries.some((s) => s.byCategory[c])).map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: categoryColor(c) }} />
            {CATEGORY_LABELS[c]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One horizontal bar split by category, for a single day. */
export function SplitBar({ summary }: { summary: DaySummary }) {
  if (summary.totalMinutes === 0) return <div className="h-2 rounded-full bg-raised" />;
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
      {CATEGORY_ORDER.map((c) =>
        summary.byCategory[c] ? (
          <div key={c} style={{ flexGrow: summary.byCategory[c], background: categoryColor(c) }} />
        ) : null,
      )}
    </div>
  );
}

/** Small progress ring for a percentage. */
export function Ring({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, Math.max(0, pct)) / 100) * c} ${c}`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}
