"use client";

import { useState } from "react";
import { AttentionPanel, SitesPanel, StatTiles, WaitingPanel } from "@/components/dashboard-panels";
import { DemoDraft } from "@/components/demo/demo-draft";
import type { DaySummary, Ranked } from "@/lib/attention";
import { formatMinutes } from "@/lib/days";
import type { DemoItem, DemoThread } from "@/lib/demo-data";

type Status = "open" | "done" | "snoozed" | "dismissed";
const LABEL = { done: "Done", snoozed: "Later", dismissed: "Hidden", open: "" } as const;

export function DemoDashboard({
  dateLabel,
  summary,
  items,
  threads,
  summaries,
  yesterday,
  weekMinutes,
  sites,
}: {
  dateLabel: string;
  summary: string;
  items: DemoItem[];
  threads: DemoThread[];
  summaries: DaySummary[];
  yesterday: DaySummary;
  weekMinutes: number;
  sites: Ranked[];
}) {
  const [status, setStatus] = useState<Record<string, Status>>({});
  const st = (id: string): Status => status[id] ?? "open";
  const set = (id: string, s: Status) => setStatus((prev) => ({ ...prev, [id]: s }));
  const byId = new Map(threads.map((t) => [t.threadId, t]));

  const open = items.filter((i) => st(i.id) === "open");
  const closed = items.filter((i) => st(i.id) !== "open");
  const done = items.filter((i) => st(i.id) === "done").length;
  const remaining = open.reduce((n, i) => n + i.minutes, 0);
  const waiting = threads.filter((t) => t.category === "needs_reply");
  const deadlines = threads.filter((t) => t.category === "deadline");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="t-page">Dashboard</h1>
        <span className="text-muted">{dateLabel}</span>
        {closed.length > 0 && (
          <button type="button" className="btn btn-sm btn-ghost ml-auto" onClick={() => setStatus({})}>
            Reset demo
          </button>
        )}
      </div>

      <StatTiles
        hasPlan
        planTotal={items.length}
        planDone={done}
        openCount={open.length}
        remainingMinutes={remaining}
        waitingCount={waiting.length}
        deadlineCount={deadlines.length}
        yesterday={yesterday}
        weekMinutes={weekMinutes}
        inboxHref="/demo/inbox"
        attentionHref="/demo/attention"
      />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="panel min-w-0 self-start">
          <div className="panel-head">
            <h2 className="t-section">Today&apos;s plan</h2>
          </div>
          <p className="border-b border-line px-3.5 py-2.5 text-[13px] text-muted">{summary}</p>
          {open.length === 0 && <p className="px-3.5 py-3 text-muted">Everything on today&apos;s plan is handled.</p>}
          <ul>
            {open.map((item) => {
              const t = item.threadId ? byId.get(item.threadId) : undefined;
              return (
                <li key={item.id} className="row flex gap-2.5 px-3.5 py-2.5">
                  <button
                    type="button"
                    className="check"
                    aria-label={`Mark done: ${item.title}`}
                    onClick={() => set(item.id, "done")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <p className="min-w-0 flex-1 font-medium">{item.title}</p>
                      <span className="t-small shrink-0 tabular-nums text-faint">{item.minutes}m</span>
                    </div>
                    <p className="text-[13px] text-muted">{item.why}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {t && <DemoDraft to={t.fromEmail} subject={t.subject} body={t.draft} />}
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => set(item.id, "snoozed")}>
                        Later
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => set(item.id, "dismissed")}>
                        Hide
                      </button>
                      {item.goal && <span className="pill ml-auto">{item.goal}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
            {closed.map((item) => (
              <li key={item.id} className="row flex items-center gap-2.5 px-3.5 py-1.5 text-[13px] text-faint">
                <span className="t-small w-11 shrink-0">{LABEL[st(item.id)]}</span>
                <span className={`min-w-0 flex-1 truncate ${st(item.id) === "done" ? "line-through" : ""}`}>
                  {item.title}
                </span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => set(item.id, "open")}>
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 self-start">
          <AttentionPanel
            summaries={summaries}
            weekMinutes={weekMinutes}
            href="/demo/attention"
            basePath="/demo/attention"
            empty="No browsing recorded yet."
          />
          <WaitingPanel waiting={waiting} inboxHref="/demo/inbox" />
          <SitesPanel sites={sites} />
        </div>
      </div>
      <p className="t-small mt-4 text-faint">
        Plan time left: {formatMinutes(remaining)}. Try checking an item off or opening a draft reply.
      </p>
    </div>
  );
}
