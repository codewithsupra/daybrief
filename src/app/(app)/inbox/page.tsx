import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { loadInbox, type InboxRow as Row } from "@/lib/inbox";
import { requireUser } from "@/lib/user";
import { prepareDraftAction, syncInboxAction } from "../actions";

const ago = (days: number) => (days === 0 ? "today" : days === 1 ? "1d ago" : `${days}d ago`);

function Section({ title, rows, draft }: { title: string; rows: Row[]; draft?: boolean }) {
  return (
    <section className="mt-5">
      <h2 className="t-section">
        {title} <span className="font-normal tabular-nums text-faint">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="panel mt-2 px-3 py-2 text-[13px] text-faint">Nothing here.</p>
      ) : (
        <ul className="panel mt-2">
          {rows.map((r) => (
            <li key={r.threadId} className="row flex items-start gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="w-32 shrink-0 truncate font-medium">{r.fromName}</span>
                  <a
                    className="min-w-0 truncate hover:underline"
                    href={`https://mail.google.com/mail/u/0/#all/${r.threadId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.subject}
                  </a>
                </div>
                <p className="truncate text-[13px] text-muted">{r.reason}</p>
              </div>
              <span className={`t-small shrink-0 pt-0.5 tabular-nums ${r.dueDate ? "text-warn" : "text-faint"}`}>
                {r.dueDate ? `due ${r.dueDate.slice(5)}` : ago(r.daysOld)}
              </span>
              {draft && (
                <ActionForm
                  action={prepareDraftAction}
                  label="Draft reply"
                  pendingLabel="Drafting…"
                  className="btn btn-sm"
                >
                  <input type="hidden" name="threadId" value={r.threadId} />
                </ActionForm>
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
    <div className="max-w-[760px]">
      <div className="flex items-center gap-3">
        <h1 className="t-page">Inbox</h1>
        <span className="t-small text-muted">
          {account?.lastSyncAt
            ? `Checked ${account.lastSyncAt.toLocaleString("en-GB", { timeZone: user.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : "Not checked yet"}
        </span>
        <div className="ml-auto">
          <ActionForm action={syncInboxAction} label="Check now" pendingLabel="Checking…" />
        </div>
      </div>
      <Section title="Waiting on you" rows={rows.filter((r) => r.category === "needs_reply")} draft />
      <Section
        title="Deadlines"
        rows={rows
          .filter((r) => r.category === "deadline")
          .sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))}
      />
      <Section
        title="No reply in 3+ days"
        rows={rows.filter((r) => r.category === "waiting" && r.daysOld >= 3)}
        draft
      />
    </div>
  );
}
