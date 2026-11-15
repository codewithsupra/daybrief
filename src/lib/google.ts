import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decrypt } from "./crypto";

export class GoogleAuthError extends Error {}

/** Exchange the stored refresh token for a short-lived access token. Nothing is cached. */
export async function accessTokenFor(userId: string): Promise<string> {
  const db = await getDb();
  const [account] = await db
    .select()
    .from(schema.googleAccounts)
    .where(eq(schema.googleAccounts.userId, userId));
  if (!account) throw new GoogleAuthError("Gmail is not connected for this account");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: decrypt(account.refreshTokenEnc),
    }),
  });
  if (!res.ok) {
    throw new GoogleAuthError(`Google refused the stored sign-in (${res.status}). Sign in again.`);
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gmail API call. Rate-limit responses (Gmail allows a fixed number of quota units
 * per user per minute) are retried with growing pauses; other failures throw a short message.
 */
export async function gmail<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${GMAIL}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init?.headers },
    });
    if (res.ok) return (await res.json()) as T;
    const body = await res.text();
    const limited = res.status === 429 || (res.status === 403 && /rateLimitExceeded|RATE_LIMIT_EXCEEDED/.test(body));
    if (limited && attempt < 5) {
      await sleep(2000 * 2 ** attempt + Math.random() * 1000);
      continue;
    }
    let message = body.slice(0, 200);
    try {
      message = JSON.parse(body).error.message;
    } catch {
      /* not JSON; keep the raw text */
    }
    throw new Error(`Gmail ${path.split("?")[0]} failed (${res.status}): ${message}`);
  }
}
