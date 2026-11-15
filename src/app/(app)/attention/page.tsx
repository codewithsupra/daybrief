import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import type { AttentionCategory } from "@/db/schema";
import { summarizeDay, topSites, topVideos, type Ranked } from "@/lib/attention";
import { CATEGORY_LABELS } from "@/lib/categorize";
import { formatMinutes, lastDays } from "@/lib/days";
import { requireUser } from "@/lib/user";

const ORDER = Object.keys(CATEGORY_LABELS) as AttentionCategory[];
const color = (c: AttentionCategory) => `var(--c-${c})`;

function RankList({ title, rows, empty }: { title: string; rows: Ranked[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <section>
      <h2 className="font-display text-xl">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                {r.url ? (
                  <a className="min-w-0 truncate hover:underline" href={r.url} target="_blank" rel="noreferrer">
                    {r.label}
                  </a>
                ) : (
                  <span className="min-w-0 truncate">{r.label}</span>
                )}
                <span className="shrink-0 tabular-nums text-muted">{formatMinutes(r.minutes)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-sunk">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.minutes / max) * 100}%`, background: color(r.category) }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Attention({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { db, user, today } = await requireUser();
  const days = lastDays(today, 7);
  const { day: picked } = await searchParams;
  const day = picked && days.includes(picked) ? picked : today;

  const events = await db
    .select()
    .from(schema.browseEvents)
    .where(and(eq(schema.browseEvents.userId, user.id), inArray(schema.browseEvents.day, days)));
  const summaries = days.map((d) => summarizeDay(d, events));
  const peak = Math.max(1, ...summaries.map((s) => s.totalMinutes));
  const current = summaries.find((s) => s.day === day)!;
  const dayEvents = events.filter((e) => e.day === day);
  const weekTotal = summaries.reduce((s, d) => s + d.totalMinutes, 0);
  const label = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

  if (events.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl">Attention</h1>
        <p className="mt-3 max-w-prose text-muted">
          Nothing recorded in the last 7 days. Install the Chrome extension from the{" "}
          <code className="rounded bg-sunk px-1">extension</code> folder and paste a token from{" "}
          <a className="underline" href="/settings">
            Settings
          </a>{" "}
          into it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Attention</h1>
      <p className="text-sm text-muted">
        {formatMinutes(weekTotal)} of active browser time over 7 days. Pick a day for detail.
      </p>

      <div className="mt-6 flex h-44 items-end gap-2" role="list" aria-label="Time per day by category">
        {summaries.map((s) => (
          <a
            key={s.day}
            role="listitem"
            href={`/attention?day=${s.day}`}
            aria-label={`${label(s.day)} ${s.day}: ${formatMinutes(s.totalMinutes)}, ${s.alignedPct}% on goals`}
            aria-current={s.day === day ? "true" : undefined}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div className="text-center text-[11px] tabular-nums text-muted">
              {s.totalMinutes ? formatMinutes(s.totalMinutes) : ""}
            </div>
            <div
              className="flex flex-col-reverse overflow-hidden rounded-t"
              style={{ height: `${(s.totalMinutes / peak) * 80}%` }}
            >
              {ORDER.map((c) =>
                s.byCategory[c] ? (
                  <div key={c} style={{ flexGrow: s.byCategory[c], background: color(c) }} />
                ) : null,
              )}
            </div>
            <div
              className={`border-t pt-1 text-center text-xs ${
                s.day === day ? "border-ink font-semibold" : "border-line text-muted"
              }`}
            >
              {label(s.day)}
            </div>
          </a>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {ORDER.filter((c) => summaries.some((s) => s.byCategory[c])).map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: color(c) }} />
            {CATEGORY_LABELS[c]}
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="font-display text-xl">
          {new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}
        </h2>
        {current.totalMinutes === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing recorded this day.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {formatMinutes(current.totalMinutes)} tracked · {current.alignedPct}% on your goals
            </p>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {ORDER.filter((c) => current.byCategory[c]).map((c) => (
                  <tr key={c} className="border-t border-line">
                    <td className="py-1.5">
                      <span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: color(c) }} />
                      {CATEGORY_LABELS[c]}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted">
                      {formatMinutes(current.byCategory[c]!)}
                    </td>
                    <td className="w-14 py-1.5 text-right tabular-nums text-muted">
                      {Math.round((current.byCategory[c]! / current.totalMinutes) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <RankList title="Top sites" rows={topSites(dayEvents)} empty="No sites this day." />
        <RankList title="Top videos" rows={topVideos(dayEvents)} empty="No YouTube videos this day." />
      </div>
    </div>
  );
}
