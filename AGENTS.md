# AGENTS.md — permanent rules for coding agents

The Morning Paper: a personal newspaper that remembers what you've read and know.
Read `SPEC.md` (what), `PLAN.md` (order), `STATUS.md` (now) before working.

## Architecture constraints

- One Next.js 16 (App Router, TypeScript, Tailwind 4) app + `worker/` scripts sharing `src/lib/`.
- Supabase: Postgres + pgvector, Auth (anonymous-first), Storage (PDFs). Drizzle for schema/migrations. RLS on every per-user table.
- Reader requests use the Supabase client (`src/lib/supabase/server.ts`) so RLS applies. The Drizzle client (`src/db`) connects as the DB owner and bypasses RLS: workers, scripts and seeds only.
- Schema changes: edit `src/db/schema.ts` → `npm run db:generate` → review SQL → `npm run db:migrate`. New tables need RLS policies **and** explicit GRANTs (this project does not auto-grant).
- Workers (ingest, build-editions) run in GitHub Actions cron and locally — never long jobs in request handlers.
- LLM: `@anthropic-ai/sdk`. `claude-opus-5-5` for writing (facts, briefs, Editor's Note); `claude-haiku-5-5` for bulk classification/extraction. Embeddings: Voyage.
- Every LLM call: structured output validated with Zod, one retry, then a deterministic fallback. `LLM_MODE=fixture` must work offline.
- Deterministic code owns ranking, weights, familiarity, deltas, scheduling, persistence, PDF. Do not add LLM calls for those.
- Editions are frozen snapshots (`edition_stories.rendered`). Never re-render past editions from current state.
- Web and PDF render from the same snapshot JSON. No microservices, no custom auth, no custom ML.
- Next.js 16 differs from older versions — check `node_modules/next/dist/docs/` before using an API.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run lint` / `npm run typecheck` / `npm run format`
- `npm test` — Vitest unit/integration
- `npm run test:e2e` — Playwright (starts the app itself)
- `npm run check` — lint + typecheck + format check + unit tests (run before every commit)
- `npm run env:check` — validate `.env.local` and DB connectivity (no secrets printed)
- `npm run db:generate` / `db:migrate` / `db:seed` — Drizzle migrations and topic seed
- `npm run ingest` / `ingest:report` / `ingest:probe` — run news ingestion, data-quality report, probe feeds

## Testing requirements

- New pure logic (ranking, weighting, familiarity, deltas, recall scheduling, schemas) ships with unit tests.
- New user-facing flows get a Playwright test; golden path must stay green.
- LLM-dependent code is tested with fixtures, including invalid JSON and timeout cases.

## Security

- Never commit secrets or `.env*` files (only `.env.example`). Read config via `src/lib/env.ts`.
- Service-role key only in workers/server code, never in client bundles.
- Treat RSS/API/scraped text as untrusted: validate, length-cap, never render as HTML.
- Preserve original URLs and source attribution; show our own briefs, not republished article text.

## Definition of done

1. `npm run check` passes and the e2e suite for touched flows passes.
2. Behaviour verified in a real browser, not just by tests.
3. Fallback path exists for any new external dependency.
4. `STATUS.md` updated; one focused commit with an accurate message.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
