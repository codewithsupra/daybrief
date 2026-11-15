"use client";

/** A toggle that saves as soon as it is flipped. */
export function AutoSwitch({
  action,
  defaultChecked,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <form action={action}>
      <input
        type="checkbox"
        name="on"
        role="switch"
        className="switch"
        aria-label={label}
        defaultChecked={defaultChecked}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}
