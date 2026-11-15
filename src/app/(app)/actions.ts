"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { getDb, schema } from "@/db";
import type { PlanItemStatus } from "@/db/schema";
import { newToken, sha256 } from "@/lib/crypto";
import { dayInZone } from "@/lib/days";
import { prepareDraft } from "@/lib/drafts";
import { refreshInbox, runDaily } from "@/lib/run-daily";
import { isDemo, requireUserId } from "@/lib/session";

export type ActionState = { message?: string; token?: string } | null;

export async function buildPlanAction(): Promise<ActionState> {
  const userId = await requireUserId();
  const r = await runDaily(userId, { email: false });
  revalidatePath("/", "layout");
  const base = r.source === "model" ? "Updated." : "Updated using simple rules; the AI model wasn't reachable.";
  return { message: [base, ...r.warnings].join(" ") };
}

export async function syncInboxAction(): Promise<ActionState> {
  const userId = await requireUserId();
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  const r = await refreshInbox(userId, dayInZone(new Date(), user.timezone));
  revalidatePath("/", "layout");
  return { message: [`${r.synced} threads checked, ${r.triaged} sorted.`, ...r.warnings].join(" ") };
}

export async function setItemStatus(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as PlanItemStatus;
  if (!["open", "done", "snoozed", "dismissed"].includes(status)) return;
  const db = await getDb();
  await db
    .update(schema.planItems)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.planItems.id, id), eq(schema.planItems.userId, userId)));
  revalidatePath("/today");
}

export async function prepareDraftAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  try {
    await prepareDraft(userId, String(formData.get("threadId")));
    return { message: "Draft is in your Gmail Drafts." };
  } catch (err) {
    return { message: (err as Error).message };
  }
}

export async function saveGoals(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const titles = formData.getAll("title").map(String);
  const details = formData.getAll("detail").map(String);
  const rows = titles
    .map((title, i) => ({ title: title.trim(), detail: (details[i] ?? "").trim() }))
    .filter((g) => g.title)
    .slice(0, 6);
  if (rows.length === 0) return { message: "Keep at least one goal." };
  const db = await getDb();
  await db.delete(schema.goals).where(eq(schema.goals.userId, userId));
  await db.insert(schema.goals).values(rows.map((g, position) => ({ ...g, position, userId })));
  revalidatePath("/settings");
  return { message: "Goals saved. They apply from the next plan." };
}

export async function saveTimezone(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const timezone = String(formData.get("timezone") ?? "").trim();
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { message: `"${timezone}" isn't a timezone like Asia/Muscat.` };
  }
  const db = await getDb();
  await db.update(schema.users).set({ timezone }).where(eq(schema.users.id, userId));
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function saveBlocklist(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const blocklist = String(formData.get("blocklist") ?? "")
    .split(/[\s,]+/)
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
    .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
    .slice(0, 200);
  const db = await getDb();
  await db.update(schema.users).set({ blocklist }).where(eq(schema.users.id, userId));
  revalidatePath("/settings");
  return { message: `Saved. ${blocklist.length} ${blocklist.length === 1 ? "site" : "sites"} blocked.` };
}

export async function setMorningEmail(formData: FormData) {
  const userId = await requireUserId();
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ morningEmail: formData.get("on") === "on" })
    .where(eq(schema.users.id, userId));
  revalidatePath("/settings");
}

export async function createExtensionToken(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const label = String(formData.get("label") ?? "").trim().slice(0, 40) || "Chrome";
  const token = newToken();
  const db = await getDb();
  await db.insert(schema.extensionTokens).values({ userId, label, tokenHash: sha256(token) });
  revalidatePath("/settings");
  return { token, message: "Paste this code into the extension. It's shown only once." };
}

export async function reconnectGmail() {
  await signIn("google", { redirectTo: "/settings" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function revokeExtensionToken(formData: FormData) {
  const userId = await requireUserId();
  const db = await getDb();
  await db
    .delete(schema.extensionTokens)
    .where(
      and(eq(schema.extensionTokens.id, String(formData.get("id"))), eq(schema.extensionTokens.userId, userId)),
    );
  revalidatePath("/settings");
}

export async function deleteAllData(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  if (String(formData.get("confirm")) !== "DELETE") return { message: "Type DELETE to confirm." };
  const db = await getDb();
  // Every table references users with ON DELETE CASCADE.
  await db.delete(schema.users).where(eq(schema.users.id, userId));
  if (isDemo()) redirect("/today");
  await signOut({ redirectTo: "/login" });
  return null;
}
