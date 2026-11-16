import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Daybrief demo",
  description: "Try Daybrief with sample data. No sign-in needed.",
};

export const dynamic = "force-dynamic";

const DEMO_NAV = [
  ["/demo", "Dashboard"],
  ["/demo/inbox", "Inbox"],
  ["/demo/attention", "Attention"],
] as const;

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-line bg-raised">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2 text-[13px]">
          <span className="pill">Demo</span>
          <span className="min-w-0 flex-1 truncate text-muted">Sample data. Nothing here is real.</span>
          <Link href="/" className="btn btn-sm btn-ghost">
            Home
          </Link>
          <Link href="/login" className="btn btn-sm btn-primary">
            Sign in
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-col sm:flex-row">
        <aside className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 sm:sticky sm:top-0 sm:h-[calc(100vh-45px)] sm:w-44 sm:shrink-0 sm:flex-col sm:items-stretch sm:gap-5 sm:overflow-visible sm:border-b-0 sm:border-r sm:px-3 sm:py-5">
          <span className="hidden items-center gap-2 px-2.5 text-[15px] font-semibold sm:flex">
            <span className="size-2.5 rounded-sm bg-accent shadow-[0_0_12px_var(--accent)]" />
            Daybrief
          </span>
          <Nav items={[...DEMO_NAV]} exact={["/demo"]} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-7">{children}</main>
      </div>
    </>
  );
}
