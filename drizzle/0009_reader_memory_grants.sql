-- Readers can read their own memory rows (RLS); all writes go through the
-- server, which verifies the session and writes with the owner connection.
GRANT SELECT ON "editions", "story_reads", "reader_concepts", "recall_answers" TO authenticated;--> statement-breakpoint
GRANT ALL ON "editions", "story_reads", "reader_concepts", "recall_answers" TO service_role;
