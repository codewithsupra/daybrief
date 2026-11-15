"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/actions";

/** A form around a server action that shows the action's message when it finishes. */
export function ActionForm({
  action,
  label,
  pendingLabel,
  className = "btn",
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {children}
      <button className={className} disabled={pending}>
        {pending ? (pendingLabel ?? "Working…") : label}
      </button>
      {state?.token && (
        <code className="t-small w-full select-all break-all rounded bg-sunk px-2 py-1">{state.token}</code>
      )}
      {state?.message && (
        <span role="status" className="t-small text-muted">
          {state.message}
        </span>
      )}
    </form>
  );
}
