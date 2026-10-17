CREATE TABLE "cluster_concepts" (
	"cluster_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	CONSTRAINT "cluster_concepts_cluster_id_concept_id_pk" PRIMARY KEY("cluster_id","concept_id")
);
--> statement-breakpoint
ALTER TABLE "cluster_concepts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"explainer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concepts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "story_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" uuid NOT NULL,
	"text" text NOT NULL,
	"importance" smallint DEFAULT 2 NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"recall" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_facts_importance" CHECK ("story_facts"."importance" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "story_facts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "dek" text;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "brief" jsonb;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "why_it_matters" text;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "key_points" jsonb;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "importance" smallint;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "enriched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD COLUMN "enriched_article_count" integer;--> statement-breakpoint
ALTER TABLE "cluster_concepts" ADD CONSTRAINT "cluster_concepts_cluster_id_story_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_concepts" ADD CONSTRAINT "cluster_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_facts" ADD CONSTRAINT "story_facts_cluster_id_story_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "concepts_slug_key" ON "concepts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "story_facts_cluster_idx" ON "story_facts" USING btree ("cluster_id","first_seen_at");