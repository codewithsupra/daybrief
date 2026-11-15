import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { currentUserId } from "@/lib/session";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUserId()) redirect("/today");
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="font-display text-4xl">Daybrief</h1>
      <p className="mt-3 text-muted">
        One plan each morning, built from your inbox and where your attention went yesterday.
      </p>
      {error && (
        <p role="alert" className="mt-6 rounded-md border border-line bg-sunk p-3 text-sm">
          {error === "AccessDenied"
            ? "That Google account isn't on the allowlist for this app."
            : error === "MissingGmail"
              ? "Google signed you in, but the Gmail permissions weren't granted. Try again and tick both Gmail boxes on Google's permission screen."
              : "Sign-in didn't complete. Try again."}
        </p>
      )}
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/today" });
        }}
      >
        <button className="btn btn-primary w-full justify-center py-2.5">Continue with Google</button>
      </form>
      <p className="mt-4 text-xs text-muted">
        Asks to read your Gmail and create drafts. It never sends, archives or deletes mail.{" "}
        <a className="underline" href="/privacy">
          What is collected
        </a>
      </p>
    </main>
  );
}
