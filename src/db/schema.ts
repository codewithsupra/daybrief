import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  timezone: text("timezone").notNull().default("UTC"),
  blocklist: jsonb("blocklist").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleAccounts = pgTable("google_accounts", {
  userId: userId().primaryKey(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userId(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  position: integer("position").notNull().default(0),
});

export type TriageCategory = "needs_reply" | "deadline" | "waiting" | "fyi" | "noise";

export const emailThreads = pgTable(
  "email_threads",
  {
    userId: userId(),
    threadId: text("thread_id").notNull(),
    subject: text("subject").notNull().default(""),
    fromName: text("from_name").notNull().default(""),
    fromEmail: text("from_email").notNull().default(""),
    snippet: text("snippet").notNull().default(""),
    lastMessageId: text("last_message_id").notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull(),
    lastFromMe: boolean("last_from_me").notNull().default(false),
    unread: boolean("unread").notNull().default(false),
    inInbox: boolean("in_inbox").notNull().default(true),
    messageCount: integer("message_count").notNull().default(1),
    category: text("category").$type<TriageCategory>(),
    reason: text("reason"),
    dueDate: text("due_date"),
    triagedMessageId: text("triaged_message_id"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.threadId] }),
    index("email_threads_recent").on(t.userId, t.lastMessageAt),
  ],
);

export type AttentionCategory =
  | "work_learning"
  | "creator"
  | "entertainment"
  | "social"
  | "news"
  | "shopping"
  | "other";

export const browseEvents = pgTable(
  "browse_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    /** Local calendar day (YYYY-MM-DD) as seen by the browser that recorded it. */
    day: text("day").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    durationSec: integer("duration_sec").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    title: text("title").notNull().default(""),
    category: text("category").$type<AttentionCategory>().notNull().default("other"),
    videoId: text("video_id"),
    channel: text("channel"),
  },
  (t) => [index("browse_events_day").on(t.userId, t.day)],
);

/** Shared cache of model-assigned categories for domains the rules don't know. */
export const domainCategories = pgTable("domain_categories", {
  domain: text("domain").primaryKey(),
  category: text("category").$type<AttentionCategory>().notNull(),
});

export type PlanMetrics = {
  totalMinutes: number;
  alignedPct: number;
  byCategory: Record<string, number>;
  needsReply: number;
  deadlines: number;
};

export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    day: text("day").notNull(),
    summary: text("summary").notNull().default(""),
    metrics: jsonb("metrics").$type<PlanMetrics>().notNull(),
    source: text("source").$type<"model" | "fallback">().notNull().default("model"),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_plans_user_day").on(t.userId, t.day)],
);

export type PlanItemStatus = "open" | "done" | "snoozed" | "dismissed";

export const planItems = pgTable(
  "plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    userId: userId(),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    why: text("why").notNull().default(""),
    goal: text("goal").notNull().default(""),
    minutes: integer("minutes").notNull().default(15),
    sourceType: text("source_type").$type<"email" | "web" | "none">().notNull().default("none"),
    sourceRef: text("source_ref"),
    status: text("status").$type<PlanItemStatus>().notNull().default("open"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plan_items_plan").on(t.planId)],
);

export const emailDrafts = pgTable("email_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userId(),
  threadId: text("thread_id").notNull(),
  gmailDraftId: text("gmail_draft_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extensionTokens = pgTable("extension_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userId(),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull().default("Chrome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});
