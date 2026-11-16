import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { currentUserId } from "@/lib/session";
import "../landing.css";

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account doesn't have access to Daybrief yet.",
  MissingGmail: "Gmail access wasn't granted. Try again and tick both Gmail boxes on Google's screen.",
};

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="rgba(0,229,153,.15)" />
      <path d="M4.6 8.3l2.2 2.2 4.6-4.9" fill="none" stroke="#00e599" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUserId()) redirect("/today");
  const { error } = await searchParams;
  return (
    <main className="si">
      <div className="lp-glow" aria-hidden />
      <div className="si-card">
        <Link href="/" className="lp-logo">
          <i />
          Daybrief
        </Link>
        <h1>Sign in to Daybrief</h1>
        <p>Use the Google account whose inbox you want planned.</p>
        {error && (
          <p role="alert" className="si-error">
            {ERRORS[error] ?? "Sign-in didn't complete. Try again."}
          </p>
        )}
        <GoogleButton />
        <ul className="si-points">
          <li>
            <Check />
            Reads your mail and writes drafts
          </li>
          <li>
            <Check />
            Never sends, archives or deletes
          </li>
        </ul>
        <p className="si-foot">
          <a href="/privacy">What&apos;s collected</a>
        </p>
      </div>
    </main>
  );
}
