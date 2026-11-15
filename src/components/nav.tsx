"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/today", "Dashboard"],
  ["/inbox", "Inbox"],
  ["/attention", "Attention"],
  ["/settings", "Settings"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 sm:flex-col" aria-label="Main">
      {NAV.map(([href, label]) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium ${
              active ? "bg-raised text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <span
              className={`hidden size-1.5 rounded-full sm:block ${active ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-transparent"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
