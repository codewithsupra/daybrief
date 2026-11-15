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

  const status = [
    ["Gmail", account ? "Connected" : "Not connected. Sign in with Google."],
    ["AI model", aiConfigured() ? "Connected" : "No key. Plans use simple rules until the Neon AI Gateway variables are set."],
    ["Morning email", process.env.RESEND_API_KEY ? "On" : "Off until RESEND_API_KEY is set."],
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-sm text-muted">{user.email}</p>
        <dl className="mt-4 text-sm">
          {status.map(([k, v]) => (
            <div key={k} className="flex gap-4 border-t border-line py-2">
              <dt className="w-32 shrink-0 text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section>
        <h2 className="font-display text-xl">Goals</h2>
        <p className="text-sm text-muted">The plan is ranked against these. Clear a title to remove a goal.</p>
        <div className="mt-3">
          <ActionForm action={saveGoals} label="Save goals" className="btn btn-primary">
            {slots.map((g, i) => (
              <div key={g?.id ?? `new-${i}`} className="grid gap-2 sm:grid-cols-[2fr_3fr]">
                <input
                  name="title"
                  className="field"
                  defaultValue={g?.title ?? ""}
                  placeholder="Goal"
                  aria-label={`Goal ${i + 1}`}
                />
                <input
                  name="detail"
                  className="field"
                  defaultValue={g?.detail ?? ""}
                  placeholder="What progress looks like"
                  aria-label={`Goal ${i + 1} detail`}
                />
              </div>
            ))}
          </ActionForm>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Browser extension</h2>
        <p className="max-w-prose text-sm text-muted">
          In Chrome open <code className="rounded bg-sunk px-1">chrome://extensions</code>, turn on Developer
          mode, choose Load unpacked and pick this project&apos;s{" "}
          <code className="rounded bg-sunk px-1">extension</code> folder. Then paste this app&apos;s address
          and a token into the extension.
        </p>
        <ul className="mt-3 text-sm">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
              <span>
                {t.label} · created {t.createdAt.toLocaleDateString("en-GB")} ·{" "}
                <span className="text-muted">
                  {t.lastUsedAt ? `last used ${t.lastUsedAt.toLocaleString("en-GB", { timeZone: user.timezone })}` : "never used"}
                </span>
              </span>
              <form action={revokeExtensionToken}>
                <input type="hidden" name="id" value={t.id} />
                <button className="btn btn-quiet">Revoke</button>
              </form>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <ActionForm action={createExtensionToken} label="Create token" />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Preferences</h2>
        <div className="mt-3">
          <ActionForm action={savePreferences} label="Save" className="btn btn-primary">
            <label className="block text-sm">
              <span className="text-muted">Timezone</span>
              <input name="timezone" className="field mt-1" defaultValue={user.timezone} />
            </label>
            <label className="block text-sm">
              <span className="text-muted">
                Sites never to record, one per line. Banking, health, mail and password managers are always
                blocked.
              </span>
              <textarea
                name="blocklist"
                rows={4}
                className="field mt-1 font-mono"
                defaultValue={user.blocklist.join("\n")}
                placeholder="example.com"
              />
            </label>
          </ActionForm>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Your data</h2>
        <p className="text-sm text-muted">
          <a className="underline" href="/privacy">
            What is collected
          </a>
        </p>
        <a className="btn mt-3" href="/api/export">
          Download everything
        </a>
        <div className="mt-6 rounded-md border border-line p-4">
          <p className="text-sm font-medium">Delete everything</p>
          <p className="text-sm text-muted">
            Removes your account, mail records, browsing history and plans from Daybrief. This can&apos;t be
            undone. Your Gmail itself is untouched.
          </p>
          <div className="mt-3">
            <ActionForm action={deleteAllData} label="Delete all my data">
              <input name="confirm" className="field max-w-48" placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
            </ActionForm>
          </div>
        </div>
      </section>
    </div>
  );
}
