import { CATEGORY_ORDER, WeekChart, categoryColor } from "@/components/week-chart";
import { summarizeDay, topSites, topVideos, type AttentionEvent, type Ranked } from "@/lib/attention";
import { CATEGORY_LABELS } from "@/lib/categorize";
import { formatMinutes } from "@/lib/days";

function RankList({ title, rows, empty }: { title: string; rows: Ranked[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <section className="min-w-0">
      <h2 className="t-section">{title}</h2>
      {rows.length === 0 ? (
        <p className="panel mt-2 px-3 py-2 text-[13px] text-faint">{empty}</p>
      ) : (
        <ul className="panel mt-2">
          {rows.map((r) => (
            <li key={r.label} className="row relative flex items-center gap-3 px-3 py-1.5 text-[13px]">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 opacity-20"
                style={{ width: `${(r.minutes / max) * 100}%`, background: categoryColor(r.category) }}
              />
              <span className="size-2 shrink-0 rounded-sm" style={{ background: categoryColor(r.category) }} />
              {r.url ? (
                <a className="relative min-w-0 flex-1 truncate hover:underline" href={r.url} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              ) : (
                <span className="relative min-w-0 flex-1 truncate">{r.label}</span>
              )}
              <span className="relative shrink-0 tabular-nums text-muted">{formatMinutes(r.minutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The Attention page body: 7-day chart, the picked day's split, and its top sites and videos. */
export function AttentionView({
  days,
  events,
  day,
  basePath,
}: {
  days: string[];
  events: AttentionEvent[];
  day: string;
  basePath: string;
}) {
  const summaries = days.map((d) => summarizeDay(d, events));
  const current = summaries.find((s) => s.day === day)!;
  const dayEvents = events.filter((e) => e.day === day);
  const weekTotal = summaries.reduce((s, d) => s + d.totalMinutes, 0);
  const dayTitle = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <div className="max-w-[760px]">
      <div className="flex items-baseline gap-3">
        <h1 className="t-page">Attention</h1>
        <span className="t-small text-muted">{formatMinutes(weekTotal)} in the browser over 7 days</span>
      </div>

      <div className="panel mt-4 p-3.5">
        <WeekChart summaries={summaries} selected={day} height={150} basePath={basePath} />
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="t-section">{dayTitle}</h2>
        {current.totalMinutes > 0 && (
          <span className="t-small tabular-nums text-muted">
            {formatMinutes(current.totalMinutes)} tracked, {current.alignedPct}% on goals
          </span>
        )}
      </div>
      {current.totalMinutes === 0 ? (
        <p className="panel mt-2 px-3 py-2 text-[13px] text-faint">Nothing recorded this day.</p>
      ) : (
        <table className="panel mt-2 w-full border-separate border-spacing-0 text-[13px]">
          <tbody>
            {CATEGORY_ORDER.filter((c) => current.byCategory[c]).map((c, i) => (
              <tr key={c}>
                <td className={`px-3 py-1.5 ${i ? "border-t border-line" : ""}`}>
                  <span className="mr-2 inline-block size-2 rounded-sm" style={{ background: categoryColor(c) }} />
                  {CATEGORY_LABELS[c]}
                </td>
                <td className={`py-1.5 text-right tabular-nums text-muted ${i ? "border-t border-line" : ""}`}>
                  {formatMinutes(current.byCategory[c]!)}
                </td>
                <td className={`w-14 px-3 py-1.5 text-right tabular-nums text-faint ${i ? "border-t border-line" : ""}`}>
                  {Math.round((current.byCategory[c]! / current.totalMinutes) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <RankList title="Sites" rows={topSites(dayEvents)} empty="No sites this day." />
        <RankList title="Videos" rows={topVideos(dayEvents)} empty="No YouTube videos this day." />
      </div>
    </div>
  );
}
