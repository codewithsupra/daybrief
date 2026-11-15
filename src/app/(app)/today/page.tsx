import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { formatMinutes } from "@/lib/days";
import { sourceUrl } from "@/lib/planner";
import { requireUser } from "@/lib/user";
import { buildPlanAction, prepareDraftAction, setItemStatus } from "../actions";

function SetStatus({
  id,
  status,
  children,
  className,
  label,
}: {
  id: string;
  status: string;
  children?: React.ReactNode;
  className: string;
  label?: string;
}) {
  return (
    <form action={setItemStatus} className="flex">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={className} aria-label={label}>
        {children}
      </button>
    </form>
  );
}

const STATUS_LABEL = { done: "Done", snoozed: "Later", dismissed: "Hidden", open: "" } as const;

export default async function Today() {
  const { db, user, today } = await requireUser();
  const [plan] = await db
    .select()
    .from(schema.dailyPlans)
    .where(and(eq(schema.dailyPlans.userId, user.id), eq(schema.dailyPlans.day, today)));
  const items = plan
    ? await db
        .select()
        .from(schema.planItems)
        .where(eq(schema.planItems.planId, plan.id))
        .orderBy(schema.planItems.position)
    : [];

  const date = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const open = items.filter((i) => i.status === "open");
  const closed = items.filter((i) => i.status !== "open");
  const remaining = open.reduce((sum, i) => sum + i.minutes, 0);

  return (
    <div className="max-w-[680px]">
      <div className="flex items-center gap-3">
        <h1 className="t-page">Today</h1>
        <span className="text-muted">{date}</span>
        <div className="ml-auto">
          <ActionForm
            action={buildPlanAction}
            label={plan ? "Rebuild" : "Build plan"}
            pendingLabel="Building…"
            className={plan ? "btn" : "btn btn-primary"}
          />
        </div>
      </div>

      {!plan ? (
        <p className="mt-4 text-muted">
          No plan yet. Building one checks your inbox and yesterday&apos;s browsing. It also runs each morning.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-[62ch] text-muted">{plan.summary}</p>

          <dl className="panel mt-4 grid grid-cols-3 divide-x divide-line">
            {[
              [String(plan.metrics.needsReply), "waiting on you"],
              [`${plan.metrics.alignedPct}%`, "on goals yesterday"],
              [formatMinutes(plan.metrics.totalMinutes), "tracked yesterday"],
            ].map(([n, label]) => (
              <div key={label} className="flex flex-wrap items-baseline gap-x-1.5 px-3 py-2">
                <dd className="text-[16px] font-semibold tabular-nums">{n}</dd>
                <dt className="t-small text-muted">{label}</dt>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="t-section">To do</h2>
            <span className="t-small tabular-nums text-muted">
              {open.length} left, about {formatMinutes(remaining)}
            </span>
          </div>

          {open.length === 0 ? (
            <p className="panel mt-2 px-3 py-3 text-muted">Everything on today&apos;s plan is handled.</p>
          ) : (
            <ul className="panel mt-2">
              {open.map((item) => {
                const url = sourceUrl(item);
                return (
                  <li key={item.id} className="row flex gap-2.5 px-3 py-2.5">
                    <SetStatus id={item.id} status="done" className="check" label={`Mark done: ${item.title}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-3">
                        <p className="min-w-0 flex-1 font-medium">{item.title}</p>
                        <span className="t-small shrink-0 tabular-nums text-faint">{item.minutes}m</span>
                      </div>
                      <p className="text-[13px] text-muted">{item.why}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {url && (
                          <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">
                            {item.sourceType === "email" ? "Open email" : "Open link"}
                          </a>
                        )}
                        {item.sourceType === "email" && item.sourceRef && (
                          <ActionForm
                            action={prepareDraftAction}
                            label="Draft reply"
                            pendingLabel="Drafting…"
                            className="btn btn-sm"
                          >
                            <input type="hidden" name="threadId" value={item.sourceRef} />
                          </ActionForm>
                        )}
                        <SetStatus id={item.id} status="snoozed" className="btn btn-sm btn-ghost">
                          Later
                        </SetStatus>
                        <SetStatus id={item.id} status="dismissed" className="btn btn-sm btn-ghost">
                          Hide
                        </SetStatus>
                        {item.goal && <span className="t-small ml-auto truncate text-good">{item.goal}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {closed.length > 0 && (
            <>
              <h2 className="t-section mt-6">Handled</h2>
              <ul className="panel mt-2">
                {closed.map((item) => (
                  <li key={item.id} className="row flex items-center gap-3 px-3 py-1.5 text-[13px] text-muted">
                    <span className="t-small w-12 shrink-0 text-faint">{STATUS_LABEL[item.status]}</span>
                    <span className={`min-w-0 flex-1 truncate ${item.status === "done" ? "line-through" : ""}`}>
                      {item.title}
                    </span>
                    <SetStatus id={item.id} status="open" className="btn btn-sm btn-ghost">
                      Undo
                    </SetStatus>
                  </li>
                ))}
              </ul>
            </>
          )}

          {plan.source === "fallback" && (
            <p className="t-small mt-4 text-faint">Built from simple rules; the AI model wasn&apos;t reachable.</p>
          )}
        </>
      )}
    </div>
  );
}
