import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Ring, SplitBar, WeekChart } from "@/components/week-chart";
import type { DaySummary, Ranked } from "@/lib/attention";
import { formatMinutes } from "@/lib/days";

const glow = (v: string) => ({ "--glow": v }) as CSSProperties;

/** The four metric tiles across the top of the dashboard. */
export function StatTiles({
  hasPlan,
  planTotal,
  planDone,
  openCount,
  remainingMinutes,
  waitingCount,
  deadlineCount,
  yesterday,
  weekMinutes,
  inboxHref,
  attentionHref,
}: {
  hasPlan: boolean;
  planTotal: number;
  planDone: number;
  openCount: number;
  remainingMinutes: number;
  waitingCount: number;
  deadlineCount: number;
  yesterday: DaySummary;
  weekMinutes: number;
  inboxHref: string;
  attentionHref: string;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="tile" style={glow("var(--accent)")}>
        <p className="t-small text-muted">Plan progress</p>
        <p className="tile-value mt-1">
          {planDone}
          <span className="text-faint"> / {planTotal}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${planTotal ? (planDone / planTotal) * 100 : 0}%` }}
          />
        </div>
        <p className="t-small mt-1.5 text-faint">
          {hasPlan ? `${openCount} left, about ${formatMinutes(remainingMinutes)}` : "No plan yet"}
        </p>
      </div>

      <Link href={inboxHref} className="tile block" style={glow("var(--c-creator)")}>
        <p className="t-small text-muted">Waiting on you</p>
        <p className="tile-value mt-1">{waitingCount}</p>
        <p className="t-small mt-[22px] text-faint">
          {deadlineCount} {deadlineCount === 1 ? "deadline" : "deadlines"} coming up
        </p>
      </Link>

      <div className="tile" style={glow("var(--c-social)")}>
        <p className="t-small text-muted">On your goals yesterday</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="tile-value">{yesterday.alignedPct}%</p>
          <Ring pct={yesterday.alignedPct} />
        </div>
        <div className="mt-1.5">
          <SplitBar summary={yesterday} />
        </div>
      </div>

      <Link href={attentionHref} className="tile block" style={glow("var(--c-entertainment)")}>
        <p className="t-small text-muted">Browser time yesterday</p>
        <p className="tile-value mt-1">{formatMinutes(yesterday.totalMinutes)}</p>
        <p className="t-small mt-[22px] text-faint">{formatMinutes(weekMinutes)} over 7 days</p>
      </Link>
    </div>
  );
}

export function AttentionPanel({
  summaries,
  weekMinutes,
  href,
  basePath,
  empty,
}: {
  summaries: DaySummary[];
  weekMinutes: number;
  href: string;
  basePath: string;
  empty: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="t-section">Attention, last 7 days</h2>
        <Link href={href} className="t-small ml-auto text-accent hover:underline">
          Details
        </Link>
      </div>
      <div className="p-3.5">
        {weekMinutes === 0 ? (
          <p className="text-[13px] text-muted">{empty}</p>
        ) : (
          <WeekChart summaries={summaries} height={116} basePath={basePath} />
        )}
      </div>
    </section>
  );
}

export type WaitingItem = { threadId: string; fromName: string; subject: string; daysOld: number };

export function WaitingPanel({
  waiting,
  inboxHref,
  threadHref,
}: {
  waiting: WaitingItem[];
  inboxHref: string;
  /** Where a row links to; without it rows are plain text. */
  threadHref?: (r: WaitingItem) => string;
}) {
  const row = (r: WaitingItem) => (
    <>
      <span className="w-24 shrink-0 truncate font-medium">{r.fromName}</span>
      <span className="min-w-0 flex-1 truncate text-muted">{r.subject}</span>
      <span className="t-small shrink-0 tabular-nums text-faint">{r.daysOld === 0 ? "today" : `${r.daysOld}d`}</span>
    </>
  );
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="t-section">Waiting on you</h2>
        <Link href={inboxHref} className="t-small ml-auto text-accent hover:underline">
          Inbox
        </Link>
      </div>
      {waiting.length === 0 ? (
        <p className="px-3.5 py-3 text-[13px] text-muted">Nobody is waiting on a reply.</p>
      ) : (
        <ul>
          {waiting.slice(0, 4).map((r) => (
            <li key={r.threadId} className="row">
              {threadHref ? (
                <a
                  className="flex items-baseline gap-2 px-3.5 py-1.5 text-[13px] hover:bg-raised"
                  href={threadHref(r)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {row(r)}
                </a>
              ) : (
                <div className="flex items-baseline gap-2 px-3.5 py-1.5 text-[13px]">{row(r)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SitesPanel({ sites }: { sites: Ranked[] }) {
  if (sites.length === 0) return null;
  const max = Math.max(1, ...sites.map((s) => s.minutes));
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="t-section">Top sites yesterday</h2>
      </div>
      <ul className="space-y-2 p-3.5">
        {sites.map((s) => (
          <li key={s.label} className="text-[13px]">
            <div className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{s.label}</span>
              <span className="shrink-0 tabular-nums text-muted">{formatMinutes(s.minutes)}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-raised">
              <div
                className="h-full rounded-full"
                style={{ width: `${(s.minutes / max) * 100}%`, background: `var(--c-${s.category})` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
