import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { ActionForm } from "@/components/action-form";
import { aiConfigured } from "@/lib/ai";
import { requireUser } from "@/lib/user";
import {
  createExtensionToken,
  deleteAllData,
  revokeExtensionToken,
  saveGoals,
  savePreferences,
} from "../actions";

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="t-section">{title}</h2>
      {hint && <p className="t-small text-muted">{hint}</p>}
      <div className="panel mt-2 p-3">{children}</div>
    </section>
  );
}

export default async function Settings() {
  const { db, user } = await requireUser();
  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, user.id))
    .orderBy(schema.goals.position);
  const tokens = await db
    .select()
    .from(schema.extensionTokens)
    .where(eq(schema.extensionTokens.userId, user.id));
  const [account] = await db
    .select()
    .from(schema.googleAccounts)
    .where(eq(schema.googleAccounts.userId, user.id));
  const slots = [...goals, ...Array.from({ length: Math.max(0, 4 - goals.length) }, () => null)];

  const status: [string, boolean, string][] = [
    ["Gmail", !!account, account ? "Connected" : "Not connected"],
    ["AI model", aiConfigured(), aiConfigured() ? "Connected" : "No key; plans use simple rules"],
    ["Morning email", !!process.env.RESEND_API_KEY, process.env.RESEND_API_KEY ? "On" : "Off; no email key set"],
  ];

  return (
    <div className="max-w-[620px]">
      <div className="flex items-baseline gap-3">
        <h1 className="t-page">Settings</h1>
        <span className="t-small text-muted">{user.email}</span>
      </div>

      <dl className="panel mt-4 text-[13px]">
        {status.map(([k, ok, v]) => (
          <div key={k} className="row flex items-center gap-2.5 px-3 py-1.5">
            <span className={`size-2 rounded-full ${ok ? "bg-good" : "bg-warn"}`} aria-hidden />
            <dt className="w-28 shrink-0 font-medium">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </div>
        ))}
      </dl>

      <Group title="Goals" hint="The plan is ranked against these. Clear a title to remove one.">
        <ActionForm action={saveGoals} label="Save goals" className="btn btn-primary">
          <div className="w-full space-y-1.5">
            {slots.map((g, i) => (
              <div key={g?.id ?? `new-${i}`} className="grid gap-1.5 sm:grid-cols-[2fr_3fr]">
                <input name="title" className="field" defaultValue={g?.title ?? ""} placeholder="Goal" aria-label={`Goal ${i + 1}`} />
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
      </Group>

      <Group
        title="Browser extension"
        hint="chrome://extensions, Developer mode, Load unpacked, pick the extension folder. Then paste this app's address and a token into it."
      >
        {tokens.length > 0 && (
          <ul className="mb-2 text-[13px]">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-1">
                <span className="font-medium">{t.label}</span>
                <span className="t-small min-w-0 flex-1 truncate text-muted">
                  {t.lastUsedAt
                    ? `last used ${t.lastUsedAt.toLocaleString("en-GB", { timeZone: user.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                    : "never used"}
                </span>
                <form action={revokeExtensionToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn btn-sm btn-ghost">Revoke</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={createExtensionToken} label="Create token" />
      </Group>

      <Group title="Preferences">
        <ActionForm action={savePreferences} label="Save" className="btn btn-primary">
          <div className="w-full space-y-2.5">
            <label className="block">
              <span className="t-small text-muted">Timezone</span>
              <input name="timezone" className="field mt-1 max-w-56" defaultValue={user.timezone} />
            </label>
            <label className="block">
              <span className="t-small text-muted">
                Sites never to record, one per line. Banking, health, mail and password managers are always skipped.
              </span>
              <textarea
                name="blocklist"
                rows={3}
                className="field mt-1"
                defaultValue={user.blocklist.join("\n")}
                placeholder="example.com"
              />
            </label>
          </div>
        </ActionForm>
      </Group>

      <Group title="Your data">
        <div className="flex flex-wrap items-center gap-2">
          <a className="btn" href="/api/export">
            Download everything
          </a>
          <a className="t-small text-muted underline" href="/privacy">
            What&apos;s collected
          </a>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <p className="t-small mb-1.5 text-muted">
            Delete your account, mail records, browsing history and plans from Daybrief. Can&apos;t be undone. Gmail
            itself is untouched.
          </p>
          <ActionForm action={deleteAllData} label="Delete all my data">
            <input name="confirm" className="field max-w-36" placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
          </ActionForm>
        </div>
      </Group>
    </div>
  );
}
