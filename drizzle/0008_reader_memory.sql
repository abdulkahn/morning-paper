CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"edition_date" date NOT NULL,
	"number" integer NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"snapshot" jsonb NOT NULL,
	"weights" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reader_concepts" (
	"user_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"exposures" integer DEFAULT 0 NOT NULL,
	"known" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reader_concepts_user_id_concept_id_pk" PRIMARY KEY("user_id","concept_id")
);
--> statement-breakpoint
ALTER TABLE "reader_concepts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recall_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"chosen_index" smallint NOT NULL,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recall_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "story_reads" (
	"user_id" uuid NOT NULL,
	"cluster_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone NOT NULL,
	"read_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "story_reads_user_id_cluster_id_pk" PRIMARY KEY("user_id","cluster_id")
);
--> statement-breakpoint
ALTER TABLE "story_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_concepts" ADD CONSTRAINT "reader_concepts_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_concepts" ADD CONSTRAINT "reader_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_answers" ADD CONSTRAINT "recall_answers_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_answers" ADD CONSTRAINT "recall_answers_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_answers" ADD CONSTRAINT "recall_answers_fact_id_story_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."story_facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reads" ADD CONSTRAINT "story_reads_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reads" ADD CONSTRAINT "story_reads_cluster_id_story_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editions_user_date_key" ON "editions" USING btree ("user_id","edition_date");--> statement-breakpoint
CREATE UNIQUE INDEX "recall_answers_once" ON "recall_answers" USING btree ("user_id","edition_id","fact_id");--> statement-breakpoint
CREATE POLICY "read own editions" ON "editions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "editions"."user_id");--> statement-breakpoint
CREATE POLICY "read own concepts" ON "reader_concepts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "reader_concepts"."user_id");--> statement-breakpoint
CREATE POLICY "read own answers" ON "recall_answers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "recall_answers"."user_id");--> statement-breakpoint
CREATE POLICY "read own story reads" ON "story_reads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "story_reads"."user_id");