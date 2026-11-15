import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { currentUserId } from "@/lib/session";

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account isn't on the allowlist for this app.",
  MissingGmail: "Gmail access wasn't granted. Sign in again and tick both Gmail boxes on Google's screen.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUserId()) redirect("/today");
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xs flex-col justify-center px-4">
      <h1 className="t-page">Daybrief</h1>
      <p className="mt-1 text-muted">A daily plan from your inbox and your browsing.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-md border border-line bg-surface p-2.5 text-[13px] text-warn">
          {ERRORS[error] ?? "Sign-in didn't complete. Try again."}
        </p>
      )}
      <form
        className="mt-5"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/today" });
        }}
      >
        <button className="btn btn-primary h-9 w-full">Continue with Google</button>
      </form>
      <p className="t-small mt-3 text-faint">
        Reads Gmail and creates drafts. Never sends or deletes.{" "}
        <a className="underline" href="/privacy">
          What&apos;s collected
        </a>
      </p>
    </main>
  );
}
