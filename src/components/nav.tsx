"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/today", "Today"],
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
            className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium ${
              active ? "bg-sunk text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
