import { Nav } from "@/components/nav";
import { requireUserId } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col sm:flex-row">
      <aside className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 sm:sticky sm:top-0 sm:h-screen sm:w-44 sm:shrink-0 sm:flex-col sm:items-stretch sm:gap-5 sm:overflow-visible sm:border-b-0 sm:border-r sm:px-3 sm:py-5">
        <span className="hidden items-center gap-2 px-2.5 text-[15px] font-semibold sm:flex">
          <span className="size-2.5 rounded-sm bg-accent shadow-[0_0_12px_var(--accent)]" />
          Daybrief
        </span>
        <Nav />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-7">{children}</main>
    </div>
  );
}
