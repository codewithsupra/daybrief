import { and, eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { formatMinutes } from "@/lib/days";
import { sourceUrl } from "@/lib/planner";
import { requireUser } from "@/lib/user";
import { buildPlanAction, prepareDraftAction, setItemStatus } from "../actions";

function StatusButton({ id, status, label, quiet }: { id: string; status: string; label: string; quiet?: boolean }) {
  return (
    <form action={setItemStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={quiet ? "btn btn-quiet px-2" : "btn"}>{label}</button>
    </form>
  );
}

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
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const open = items.filter((i) => i.status === "open");
  const closed = items.filter((i) => i.status !== "open");
  const remaining = open.reduce((sum, i) => sum + i.minutes, 0);

  return (
    <div>
      <p className="text-sm uppercase tracking-widest text-muted">{date}</p>
      {!plan ? (
        <div className="mt-4">
          <h1 className="font-display text-3xl">No plan for today yet</h1>
          <p className="mt-2 max-w-prose text-muted">
            Building one checks your inbox, looks at yesterday&apos;s browsing and writes 5–7 actions. It
            also runs on its own each morning.
          </p>
          <div className="mt-6">
            <ActionForm
              action={buildPlanAction}
              label="Build today's plan"
              pendingLabel="Reading inbox and writing plan…"
              className="btn btn-primary"
            />
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-3 max-w-prose font-display text-2xl leading-snug sm:text-3xl">{plan.summary}</h1>

          <dl className="mt-6 grid grid-cols-3 gap-2 text-sm">
            {[
              [String(plan.metrics.needsReply), "emails waiting on you"],
              [`${plan.metrics.alignedPct}%`, "of yesterday on your goals"],
              [formatMinutes(plan.metrics.totalMinutes), "tracked yesterday"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-md bg-sunk p-3">
                <dd className="font-display text-2xl">{n}</dd>
                <dt className="text-xs text-muted">{label}</dt>
              </div>
            ))}
          </dl>

          <h2 className="mt-10 flex items-baseline justify-between text-sm font-semibold uppercase tracking-wider text-muted">
            <span>To do</span>
            <span className="font-normal normal-case tracking-normal">
              {open.length} left · about {formatMinutes(remaining)}
            </span>
          </h2>
          {open.length === 0 && <p className="mt-4 text-muted">Everything on today&apos;s plan is handled.</p>}
          <ol className="mt-2">
            {open.map((item, n) => {
              const url = sourceUrl(item);
              return (
                <li key={item.id} className="flex gap-4 border-t border-line py-4">
                  <span className="w-5 pt-0.5 font-display text-lg text-muted">{n + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.title} <span className="font-normal text-muted">· {item.minutes}m</span>
                    </p>
                    <p className="mt-1 text-sm text-muted">{item.why}</p>
                    {item.goal && <p className="mt-1 text-xs text-good">For: {item.goal}</p>}
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <StatusButton id={item.id} status="done" label="Done" />
                      {url && (
                        <a className="btn" href={url} target="_blank" rel="noreferrer">
                          {item.sourceType === "email" ? "Open email" : "Open link"}
                        </a>
                      )}
                      {item.sourceType === "email" && item.sourceRef && (
                        <ActionForm action={prepareDraftAction} label="Prepare draft" pendingLabel="Writing draft…">
                          <input type="hidden" name="threadId" value={item.sourceRef} />
                        </ActionForm>
                      )}
                      <StatusButton id={item.id} status="snoozed" label="Not today" quiet />
                      <StatusButton id={item.id} status="dismissed" label="Don't suggest" quiet />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {closed.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Handled</h2>
              <ul className="mt-2">
                {closed.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border-t border-line py-2 text-sm text-muted">
                    <span className="w-20 shrink-0 text-xs">
                      {item.status === "done" ? "Done" : item.status === "snoozed" ? "Not today" : "Dismissed"}
                    </span>
                    <span className={`min-w-0 flex-1 ${item.status === "done" ? "line-through" : ""}`}>
                      {item.title}
                    </span>
                    <StatusButton id={item.id} status="open" label="Undo" quiet />
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-10 border-t border-line pt-4">
            <ActionForm
              action={buildPlanAction}
              label="Rebuild plan"
              pendingLabel="Reading inbox and writing plan…"
              className="btn btn-quiet px-0"
            />
            {plan.source === "fallback" && (
              <p className="mt-1 text-xs text-muted">
                This plan was built from simple rules because no AI model was reachable.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
