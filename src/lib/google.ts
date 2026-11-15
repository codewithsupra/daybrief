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

export async function gmail<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Gmail ${path.split("?")[0]} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}
