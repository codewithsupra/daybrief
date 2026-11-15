import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { AutoSwitch } from "@/components/auto-switch";
import { isDemo } from "@/lib/session";
import { requireUser } from "@/lib/user";
import {
  createExtensionToken,
  deleteAllData,
  reconnectGmail,
  revokeExtensionToken,
  saveBlocklist,
  saveGoals,
  saveTimezone,
  setMorningEmail,
  signOutAction,
} from "../actions";

/** One settings section: name and explanation on the left, controls on the right. */
function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-8 gap-y-3 border-t border-line py-6 md:grid-cols-[200px_minmax(0,1fr)]">
      <div>
        <h2 className="t-section">{title}</h2>
        <p className="t-small mt-1 text-muted">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const when = (d: Date, timeZone: string) =>
  d.toLocaleString("en-GB", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Settings() {
  const { db, user } = await requireUser();
  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, user.id))
    .orderBy(schema.goals.position);
  const devices = await db
    .select()
    .from(schema.extensionTokens)
    .where(eq(schema.extensionTokens.userId, user.id));
  const [gmail] = await db
    .select()
    .from(schema.googleAccounts)
    .where(eq(schema.googleAccounts.userId, user.id));
  const slots = [...goals, ...Array.from({ length: Math.max(0, 4 - goals.length) }, () => null)];
  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <div className="max-w-[820px]">
      <h1 className="t-page">Settings</h1>

      <div className="mt-4">
        <Section title="Account" hint="Who you're signed in as.">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-[15px] font-semibold text-black">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name ?? "Your account"}</p>
              <p className="t-small truncate text-muted">{user.email}</p>
            </div>
            {!isDemo() && (
              <form action={signOutAction}>
                <button className="btn">Sign out</button>
              </form>
            )}
          </div>
          <div className="mt-4">
            <ActionForm action={saveTimezone} label="Save">
              <label className="block">
                <span className="t-small text-muted">Timezone</span>
                <input name="timezone" className="field mt-1 w-56" defaultValue={user.timezone} />
              </label>
              <span className="basis-full" />
            </ActionForm>
          </div>
        </Section>

        <Section title="Goals" hint="Your plan is ranked against these. Clear a goal's name to remove it.">
          <ActionForm action={saveGoals} label="Save goals" className="btn btn-primary">
            <div className="w-full space-y-2">
              {slots.map((g, i) => (
                <div key={g?.id ?? `new-${i}`} className="grid gap-2 sm:grid-cols-[2fr_3fr]">
                  <input name="title" className="field" defaultValue={g?.title ?? ""} placeholder="Add a goal" aria-label={`Goal ${i + 1}`} />
                  <input
                    name="detail"
                    className="field"
                    defaultValue={g?.detail ?? ""}
                    placeholder="What progress looks like"
                    aria-label={`Goal ${i + 1} detail`}
                  />
                </div>
              ))}
            </div>
          </ActionForm>
        </Section>

        <Section title="Connections" hint="Where Daybrief gets its information.">
          <div className="panel">
            <div className="row flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">Gmail</p>
                <p className="t-small truncate text-muted">
                  {gmail
                    ? `${user.email}${gmail.lastSyncAt ? `, last checked ${when(gmail.lastSyncAt, user.timezone)}` : ""}`
                    : "Reads your inbox and prepares draft replies. Never sends."}
                </p>
              </div>
              {gmail && <span className="pill">Connected</span>}
              {!isDemo() && (
                <form action={reconnectGmail}>
                  <button className={gmail ? "btn btn-sm" : "btn btn-primary"}>{gmail ? "Reconnect" : "Connect"}</button>
                </form>
              )}
            </div>

            <div className="row px-3.5 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Chrome extension</p>
                  <p className="t-small text-muted">Records time on sites and YouTube videos. Never page contents.</p>
                </div>
                {devices.length > 0 && (
                  <span className="pill">
                    {devices.length} {devices.length === 1 ? "browser" : "browsers"}
                  </span>
                )}
              </div>
              {devices.length > 0 && (
                <ul className="mt-2">
                  {devices.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-1 text-[13px]">
                      <span className="font-medium">{d.label}</span>
                      <span className="t-small min-w-0 flex-1 truncate text-muted">
                        {d.lastUsedAt ? `active ${when(d.lastUsedAt, user.timezone)}` : "not used yet"}
                      </span>
                      <form action={revokeExtensionToken}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="btn btn-sm btn-ghost">Remove</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2.5">
                <ActionForm action={createExtensionToken} label="Add a browser" className="btn btn-sm">
                  <input name="label" className="field w-44" placeholder="Name, e.g. Work laptop" aria-label="Browser name" />
                </ActionForm>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Notifications" hint="How your plan reaches you.">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Morning email</p>
              <p className="t-small text-muted">Today&apos;s plan, sent to {user.email} each morning.</p>
            </div>
            <AutoSwitch action={setMorningEmail} defaultChecked={user.morningEmail} label="Morning email" />
          </div>
        </Section>

        <Section
          title="Privacy"
          hint="Sites the extension never records. Banking, health, mail and password managers are always skipped."
        >
          <ActionForm action={saveBlocklist} label="Save">
            <textarea
              name="blocklist"
              rows={3}
              className="field"
              defaultValue={user.blocklist.join("\n")}
              placeholder="One site per line, e.g. example.com"
              aria-label="Blocked sites"
            />
          </ActionForm>
          <a className="t-small mt-2 inline-block text-accent hover:underline" href="/privacy">
            What Daybrief collects
          </a>
        </Section>

        <Section title="Your data" hint="Take a copy, or remove everything.">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Export</p>
              <p className="t-small text-muted">Everything Daybrief holds about you, as one file.</p>
            </div>
            <a className="btn" href="/api/export">
              Download
            </a>
          </div>
          <div className="mt-4 rounded-xl border border-danger/30 p-3.5">
            <p className="font-medium text-danger">Delete account</p>
            <p className="t-small mt-0.5 text-muted">
              Removes your mail records, browsing history and plans from Daybrief for good. Your Gmail is untouched.
            </p>
            <div className="mt-2.5">
              <ActionForm action={deleteAllData} label="Delete everything" className="btn btn-danger">
                <input name="confirm" className="field w-36" placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
              </ActionForm>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
