CREATE TABLE "browse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_sec" integer NOT NULL,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"video_id" text,
	"channel" text
);
--> statement-breakpoint
CREATE TABLE "daily_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"metrics" jsonb NOT NULL,
	"source" text DEFAULT 'model' NOT NULL,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_categories" (
	"domain" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"thread_id" text NOT NULL,
	"gmail_draft_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"user_id" uuid NOT NULL,
	"thread_id" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"from_email" text DEFAULT '' NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"last_message_id" text NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"last_from_me" boolean DEFAULT false NOT NULL,
	"unread" boolean DEFAULT false NOT NULL,
	"in_inbox" boolean DEFAULT true NOT NULL,
	"message_count" integer DEFAULT 1 NOT NULL,
	"category" text,
	"reason" text,
	"due_date" text,
	"triaged_message_id" text,
	CONSTRAINT "email_threads_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "extension_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text DEFAULT 'Chrome' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "extension_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"last_sync_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"minutes" integer DEFAULT 15 NOT NULL,
	"source_type" text DEFAULT 'none' NOT NULL,
	"source_ref" text,
	"status" text DEFAULT 'open' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"blocklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "browse_events" ADD CONSTRAINT "browse_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD CONSTRAINT "extension_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_daily_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."daily_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "browse_events_day" ON "browse_events" USING btree ("user_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_user_day" ON "daily_plans" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "email_threads_recent" ON "email_threads" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "plan_items_plan" ON "plan_items" USING btree ("plan_id");