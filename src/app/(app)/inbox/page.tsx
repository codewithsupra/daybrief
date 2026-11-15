import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { loadInbox, type InboxRow as Row } from "@/lib/inbox";
import { requireUser } from "@/lib/user";
import { prepareDraftAction, syncInboxAction } from "../actions";

const ago = (days: number) => {
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

function Section({ title, hint, rows, draft }: { title: string; hint: string; rows: Row[]; draft?: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-baseline gap-2 font-display text-xl">
        {title} <span className="font-sans text-sm text-muted">{rows.length}</span>
      </h2>
      <p className="text-sm text-muted">{hint}</p>
      {rows.length === 0 ? (
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="mt-3">
          {rows.map((r) => (
            <li key={r.threadId} className="border-t border-line py-3">
              <div className="flex items-baseline justify-between gap-3">
                <a
                  className="min-w-0 truncate font-medium hover:underline"
                  href={`https://mail.google.com/mail/u/0/#all/${r.threadId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.subject}
                </a>
                <span className="shrink-0 text-xs text-muted">
                  {r.dueDate ? `due ${r.dueDate}` : ago(r.daysOld)}
                </span>
              </div>
              <p className="text-sm text-muted">
                {r.fromName} · {r.reason}
              </p>
              {draft && (
                <div className="mt-2">
                  <ActionForm action={prepareDraftAction} label="Prepare draft" pendingLabel="Writing draft…">
                    <input type="hidden" name="threadId" value={r.threadId} />
                  </ActionForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Inbox() {
  const { db, user } = await requireUser();
  const rows = await loadInbox(user.id);
  const [account] = await db
    .select()
    .from(schema.googleAccounts)
    .where(eq(schema.googleAccounts.userId, user.id));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Inbox</h1>
          <p className="text-sm text-muted">
            {account?.lastSyncAt
              ? `Last checked ${account.lastSyncAt.toLocaleString("en-GB", { timeZone: user.timezone, dateStyle: "medium", timeStyle: "short" })}`
              : "Not checked yet"}
            . Newsletters, receipts and FYIs are left out.
          </p>
        </div>
        <ActionForm action={syncInboxAction} label="Check now" pendingLabel="Checking Gmail…" />
      </div>
      <Section
        title="Waiting on you"
        hint="Someone is expecting an answer."
        rows={rows.filter((r) => r.category === "needs_reply")}
        draft
      />
      <Section
        title="Deadlines"
        hint="Something to do by a date."
        rows={rows.filter((r) => r.category === "deadline").sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))}
      />
      <Section
        title="Gone quiet"
        hint="You wrote last, three or more days ago, and haven't heard back."
        rows={rows.filter((r) => r.category === "waiting" && r.daysOld >= 3)}
        draft
      />
    </div>
  );
}
