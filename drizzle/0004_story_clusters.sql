CREATE TABLE "story_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"topic_slug" text,
	"embedding_model" text NOT NULL,
	"centroid" vector(1024) NOT NULL,
	"key_terms" text[] DEFAULT '{}'::text[] NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_article_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_clusters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "embedding_model" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "cluster_id" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "clustered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD CONSTRAINT "story_clusters_topic_slug_topics_slug_fk" FOREIGN KEY ("topic_slug") REFERENCES "public"."topics"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_clusters_active_idx" ON "story_clusters" USING btree ("embedding_model","last_article_at");--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_cluster_id_story_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_cluster_idx" ON "articles" USING btree ("cluster_id");