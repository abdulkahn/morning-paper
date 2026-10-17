-- Pipeline tables are worker-only: no grants to anon/authenticated, and RLS
-- with no policies. service_role (admin tooling) gets full access.
GRANT ALL ON "sources", "articles", "pipeline_runs" TO service_role;
