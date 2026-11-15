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
    <form action={formAction} className="space-y-2">
      {children}
      <button className={className} disabled={pending}>
        {pending ? (pendingLabel ?? "Working…") : label}
      </button>
      {state?.token && (
        <code className="block select-all break-all rounded bg-sunk p-2 text-xs">{state.token}</code>
      )}
      {state?.message && (
        <p role="status" className="text-sm text-muted">
          {state.message}
        </p>
      )}
    </form>
  );
}
