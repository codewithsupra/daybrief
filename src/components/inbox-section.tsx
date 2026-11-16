import type { ReactNode } from "react";

export type InboxItem = {
  threadId: string;
  subject: string;
  fromName: string;
  reason: string | null;
  dueDate: string | null;
  daysOld: number;
};

const ago = (days: number) => (days === 0 ? "today" : days === 1 ? "1d ago" : `${days}d ago`);

/** One group of threads (waiting on you, deadlines, gone quiet). */
export function InboxSection({
  title,
  rows,
  renderDraft,
  threadHref,
}: {
  title: string;
  rows: InboxItem[];
  /** Draft-reply control for a row; leave out for groups that don't offer one. */
  renderDraft?: (row: InboxItem) => ReactNode;
  /** Where the subject links to; without it the subject is plain text. */
  threadHref?: (row: InboxItem) => string;
}) {
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
                  {threadHref ? (
                    <a
                      className="min-w-0 truncate hover:underline"
                      href={threadHref(r)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.subject}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate">{r.subject}</span>
                  )}
                </div>
                <p className="truncate text-[13px] text-muted">{r.reason}</p>
              </div>
              <span className={`t-small shrink-0 pt-0.5 tabular-nums ${r.dueDate ? "text-warn" : "text-faint"}`}>
                {r.dueDate ? `due ${r.dueDate.slice(5)}` : ago(r.daysOld)}
              </span>
              {renderDraft?.(r)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
