import { signOut } from "@/auth";
import { Nav } from "@/components/nav";
import { isDemo, requireUserId } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();
  return (
    <div className="mx-auto flex max-w-[980px] flex-col sm:flex-row">
      <aside className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 sm:sticky sm:top-0 sm:h-screen sm:w-44 sm:shrink-0 sm:flex-col sm:items-stretch sm:gap-4 sm:overflow-visible sm:border-b-0 sm:border-r sm:px-4 sm:py-5">
        <span className="hidden text-[14px] font-semibold sm:block sm:px-2.5">Daybrief</span>
        <Nav />
        <div className="ml-auto shrink-0 whitespace-nowrap sm:ml-0 sm:mt-auto sm:px-2.5">
          {isDemo() ? (
            <span className="t-small text-faint">Sample data</span>
          ) : (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="t-small text-muted hover:text-ink">Sign out</button>
            </form>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-8">{children}</main>
    </div>
  );
}
