# Daybrief

One plan each morning, built from your Gmail inbox and where your attention went (web + YouTube).

- **Today** – 5–7 ranked actions with why, time estimate and a link to the source. Mark done, "not today" or "don't suggest"; that feeds the next plan.
- **Inbox** – threads waiting on you, deadlines, and ones that have gone quiet. "Prepare draft" writes a reply into Gmail Drafts. Nothing is ever sent.
- **Attention** – 7 days of active browser time by category, top sites and videos, share of time on your goals.
- **Settings** – goals, blocklist, extension tokens, export and delete.

## Try it with sample data (no accounts needed)

```bash
pnpm install
pnpm seed
DEMO_MODE=1 pnpm dev
```

Uses an embedded database in `.data/`. Without an AI key, triage and the plan come from simple rules.

## Run it on your own accounts

1. `cp .env.example .env.local`, then generate the three secrets:
   `openssl rand -base64 32` for `AUTH_SECRET` and again for `TOKEN_ENCRYPTION_KEY`; `openssl rand -hex 32` for `CRON_SECRET`.
2. **Google sign-in** – in Google Cloud Console: create a project → enable the **Gmail API** → OAuth consent screen (External, Testing) → add yourself as a test user → add scopes `gmail.readonly` and `gmail.compose` → Credentials → OAuth client (Web) with redirect URI `http://localhost:3000/api/auth/callback/google` (and the same path on your deployed URL). Put the id/secret in `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and your address in `ALLOWED_EMAILS`.
3. **AI** – `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN` from the Neon AI Gateway.
4. **Database** – a Neon Postgres URL in `DATABASE_URL`, then `pnpm db:migrate`. (Leave it empty to keep using the embedded local database.)
5. **Morning email** – `RESEND_API_KEY`. The default sender only delivers to the address that owns the Resend account, which is enough for one person.
6. `pnpm dev`, sign in, press **Build today's plan**.

## Browser extension

`chrome://extensions` → Developer mode → **Load unpacked** → choose `extension/`. In Settings create a token; paste the app address and token into the extension popup. It records the active tab's address, title and time (plus channel on YouTube), never page contents or incognito, and skips the blocklist.

## Deploy

Deploy to Vercel with the same environment variables (`APP_URL` set to the deployed address). `vercel.json` runs the morning job at 02:30 UTC (06:30 in Muscat); change the schedule for another timezone.

## Develop

```bash
pnpm test        # unit tests
pnpm typecheck
pnpm lint
pnpm db:generate # after changing src/db/schema.ts
```

## Not built yet

Public sign-up and billing, Google's security review (required before more than 100 Gmail users), creator analytics, chat, Outlook.
