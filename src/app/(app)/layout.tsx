import Link from "next/link";
import { signOut } from "@/auth";
import { isDemo, requireUserId } from "@/lib/session";

const NAV = [
  ["/today", "Today"],
  ["/inbox", "Inbox"],
  ["/attention", "Attention"],
  ["/settings", "Settings"],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-4">
        <Link href="/today" className="font-display text-xl">
          Daybrief
        </Link>
        <nav className="flex gap-4 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="text-muted hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-sm">
          {isDemo() ? (
            <span className="rounded bg-sunk px-2 py-1 text-xs text-muted">Demo data</span>
          ) : (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          )}
        </div>
      </header>
      <main className="pt-8">{children}</main>
    </div>
  );
}
