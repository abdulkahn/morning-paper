CREATE TABLE "events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"topic_slug" text,
	"cluster_id" uuid,
	"edition_story_id" uuid,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_type_valid" CHECK (type in ('pair_choice', 'story_open', 'story_dwell', 'original_open', 'story_skip', 'more_like_this', 'less_like_this', 'follow_story', 'unfollow_story', 'mute_topic', 'unmute_topic', 'explainer_open', 'concept_known', 'recall_answer'))
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"reading_minutes" smallint DEFAULT 15 NOT NULL,
	"reader_context" text,
	"timezone" text DEFAULT 'Asia/Karachi' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_reading_minutes" CHECK ("profiles"."reading_minutes" in (5, 15, 25)),
	CONSTRAINT "profiles_display_name_len" CHECK ("profiles"."display_name" is null or char_length("profiles"."display_name") between 1 and 40),
	CONSTRAINT "profiles_reader_context_len" CHECK ("profiles"."reader_context" is null or char_length("profiles"."reader_context") <= 500)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "topics" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_topic_base" (
	"user_id" uuid NOT NULL,
	"topic_slug" text NOT NULL,
	"base_weight" real DEFAULT 0.5 NOT NULL,
	"muted" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_topic_base_user_id_topic_slug_pk" PRIMARY KEY("user_id","topic_slug"),
	CONSTRAINT "user_topic_base_weight_range" CHECK ("user_topic_base"."base_weight" between 0 and 1)
);
--> statement-breakpoint
ALTER TABLE "user_topic_base" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_topic_slug_topics_slug_fk" FOREIGN KEY ("topic_slug") REFERENCES "public"."topics"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_slug_topics_slug_fk" FOREIGN KEY ("parent_slug") REFERENCES "public"."topics"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_topic_base" ADD CONSTRAINT "user_topic_base_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_topic_base" ADD CONSTRAINT "user_topic_base_topic_slug_topics_slug_fk" FOREIGN KEY ("topic_slug") REFERENCES "public"."topics"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_user_created_idx" ON "events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE POLICY "read own events" ON "events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "events"."user_id");--> statement-breakpoint
CREATE POLICY "append own events" ON "events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "events"."user_id");--> statement-breakpoint
CREATE POLICY "read own profile" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."user_id");--> statement-breakpoint
CREATE POLICY "create own profile" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "profiles"."user_id");--> statement-breakpoint
CREATE POLICY "update own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."user_id") WITH CHECK ((select auth.uid()) = "profiles"."user_id");--> statement-breakpoint
CREATE POLICY "topics are public" ON "topics" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "manage own topic weights" ON "user_topic_base" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "user_topic_base"."user_id") WITH CHECK ((select auth.uid()) = "user_topic_base"."user_id");