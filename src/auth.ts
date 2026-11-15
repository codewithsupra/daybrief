import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { encrypt } from "@/lib/crypto";
import { DEFAULT_GOALS } from "@/lib/defaults";

const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  // Used only to create drafts. The app never sends mail.
  "https://www.googleapis.com/auth/gmail.compose",
];
const GMAIL_SCOPES = ["openid", "email", "profile", ...REQUIRED_SCOPES].join(" ");

function allowed(email: string | null | undefined): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export async function ensureUser(email: string, name?: string | null): Promise<string> {
  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return existing.id;
  const [created] = await db
    .insert(schema.users)
    .values({ email, name: name ?? null, timezone: process.env.DEFAULT_TIMEZONE ?? "UTC" })
    .returning();
  await db
    .insert(schema.goals)
    .values(DEFAULT_GOALS.map((g, position) => ({ ...g, position, userId: created.id })));
  return created.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: { scope: GMAIL_SCOPES, access_type: "offline", prompt: "consent" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Only emails on the allowlist get in; everyone else is refused before any data is stored.
    signIn({ profile, account }) {
      if (!allowed(profile?.email)) return false;
      // Google lets people untick individual permissions. Without both, nothing can work.
      const granted = (account?.scope ?? "").split(" ");
      const missing = REQUIRED_SCOPES.some((s) => !granted.includes(s));
      return missing ? "/login?error=MissingGmail" : true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const userId = await ensureUser(profile.email, profile.name);
        if (account.refresh_token) {
          const db = await getDb();
          const refreshTokenEnc = encrypt(account.refresh_token);
          await db
            .insert(schema.googleAccounts)
            .values({ userId, refreshTokenEnc })
            .onConflictDoUpdate({
              target: schema.googleAccounts.userId,
              set: { refreshTokenEnc },
            });
        }
        token.userId = userId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
});
