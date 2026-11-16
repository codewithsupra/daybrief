import { DemoDraft } from "@/components/demo/demo-draft";
import { InboxSection } from "@/components/inbox-section";
import { demoWorld } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default function DemoInbox() {
  const { threads } = demoWorld();
  const byId = new Map(threads.map((t) => [t.threadId, t]));
  const draft = (r: { threadId: string }) => {
    const t = byId.get(r.threadId)!;
    return <DemoDraft to={t.fromEmail} subject={t.subject} body={t.draft} />;
  };
  return (
    <div className="max-w-[760px]">
      <div className="flex items-center gap-3">
        <h1 className="t-page">Inbox</h1>
        <span className="t-small text-muted">Sample mail, sorted by an AI model</span>
      </div>
      <InboxSection title="Waiting on you" rows={threads.filter((t) => t.category === "needs_reply")} renderDraft={draft} />
      <InboxSection title="Deadlines" rows={threads.filter((t) => t.category === "deadline")} />
      <InboxSection title="No reply in 3+ days" rows={threads.filter((t) => t.category === "waiting")} renderDraft={draft} />
    </div>
  );
}
