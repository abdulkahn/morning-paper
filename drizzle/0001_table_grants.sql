-- Table privileges for Supabase API roles. RLS policies decide WHICH rows a
-- reader can touch; these grants decide WHAT they can do at all. Least
-- privilege: topics read-only, profiles never deleted by readers, events
-- append-only.
GRANT SELECT ON "topics" TO anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "profiles" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_topic_base" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON "events" TO authenticated;--> statement-breakpoint
GRANT ALL ON "topics", "profiles", "user_topic_base", "events" TO service_role;
