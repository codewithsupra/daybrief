"use client";

import { useRef } from "react";

/** Draft-reply button for the demo: shows a sample draft instead of writing to Gmail. */
export function DemoDraft({ to, subject, body }: { to: string; subject: string; body: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  if (!body) return null;
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => ref.current?.showModal()}>
        Draft reply
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/70"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="p-5">
          <p className="t-small text-muted">Draft saved to Gmail Drafts</p>
          <dl className="mt-3 grid grid-cols-[48px_minmax(0,1fr)] gap-y-1 text-[13px]">
            <dt className="text-faint">To</dt>
            <dd className="truncate">{to}</dd>
            <dt className="text-faint">Subject</dt>
            <dd className="truncate">Re: {subject}</dd>
          </dl>
          <p className="mt-3 whitespace-pre-line rounded-lg border border-line bg-bg p-3 text-[14px] leading-relaxed">{body}</p>
          <p className="t-small mt-3 text-muted">
            In the real app you read it, change it and send it yourself. Daybrief can write drafts but never sends mail.
          </p>
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn" onClick={() => ref.current?.close()} autoFocus>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
