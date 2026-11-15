import { redirect } from "next/navigation";
import { auth, ensureUser } from "@/auth";

export const isDemo = () =>
  process.env.DEMO_MODE === "1" && process.env.NODE_ENV !== "production";

/** The signed-in user's id, or null. In local demo mode, a fixed demo user. */
export async function currentUserId(): Promise<string | null> {
  if (isDemo()) return ensureUser("demo@daybrief.local", "Demo");
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) redirect("/login");
  return id;
}
