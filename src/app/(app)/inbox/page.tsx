import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { InboxSection, type InboxItem } from "@/components/inbox-section";
import { loadInbox } from "@/lib/inbox";
import { requireUser } from "@/lib/user";
import { prepareDraftAction, syncInboxAction } from "../actions";

const gmailThread = (r: InboxItem) => `https://mail.google.com/mail/u/0/#all/${r.threadId}`;

const draftButton = (r: InboxItem) => (
  <ActionForm action={prepareDraftAction} label="Draft reply" pendingLabel="Drafting…" className="btn btn-sm">
    <input type="hidden" name="threadId" value={r.threadId} />
  </ActionForm>
);

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
      <InboxSection
        title="Waiting on you"
        rows={rows.filter((r) => r.category === "needs_reply")}
        renderDraft={draftButton}
        threadHref={gmailThread}
      />
      <InboxSection
        title="Deadlines"
        rows={rows
          .filter((r) => r.category === "deadline")
          .sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))}
        threadHref={gmailThread}
      />
      <InboxSection
        title="No reply in 3+ days"
        rows={rows.filter((r) => r.category === "waiting" && r.daysOld >= 3)}
        renderDraft={draftButton}
        threadHref={gmailThread}
      />
    </div>
  );
}
