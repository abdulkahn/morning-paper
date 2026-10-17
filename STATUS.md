# STATUS

_Last updated: 2026-10-17_

## Completed

- **M0** — Next.js 16.4 + TypeScript + Tailwind 4 scaffold, ESLint + Prettier, Vitest, Playwright, GitHub Actions CI, Zod env schema, docs. Repo: https://github.com/abdulkahn/morning-paper
- **M1** — `EditionSnapshot` content model (`src/lib/edition/schema.ts`), sample edition fixture, web paper `/paper/[editionId]`, print layout `/print/[editionId]`, PDF route `/api/pdf/[editionId]`. Local PDF: 2 A4 pages, 3 columns, running header, "Page X of Y" via `@page` margin boxes, ~350 KB locally. Deployed at https://morning-paper-mocha.vercel.app — PDF verified on Vercel (244 KB, ~2.8 s warm) via @sparticuz/chromium.
- **M2** — Supabase (Postgres 17, pgvector 0.8.2, region ap-southeast-2). Drizzle schema + migrations `0000_readers_and_topics`, `0001_table_grants`: `topics` (17 seeded), `profiles`, `user_topic_base`, `events` (append-only), all with RLS + least-privilege grants. Anonymous sign-in via "Start my paper" → profile row → `/onboarding` placeholder. Session refresh in `src/proxy.ts`. RLS verified by integration tests against the live project.
- **M3** — Ingestion worker (`worker/ingest.ts`, logic in `src/lib/ingest/`): 36 probed RSS feeds (global, tech, 7 AI/robotics, 6 Pakistani, sport, science, crypto) + optional Guardian full-text API. Canonical URLs, HTML/entity cleanup, 72 h freshness window, per-source failure isolation, `pipeline_runs` log. First runs: ~726 fresh articles in ~25 s, 0 failures, re-runs idempotent. Scheduled every 2 h by `.github/workflows/ingest.yml` (needs `DATABASE_URL` repo secret).

## In progress

- **M4a (in progress)** — Story clustering works end to end with the offline hash embedding (`hash-v1`): `story_clusters` (pgvector centroid), in-memory batch assignment, `npm run cluster`, chained after ingest in the cron. 740 real articles → 664 stories; multi-source stories group correctly. Hash model scores ~81% on 129 labelled pairs (`src/lib/cluster/__fixtures__`). Voyage (`voyage-4-lite`) path is built and unit-tested but **not yet run or calibrated** — needs `VOYAGE_API_KEY`. Promo/coupon posts now filtered at ingestion.

## Decisions

- Ingestion stores RSS descriptions only (no page scraping). Article-page excerpts are deferred to M4 and only if fact extraction needs them; Guardian API supplies licensed full text when `GUARDIAN_API_KEY` is set.
- Stack: Next.js on Vercel · Supabase (Postgres + pgvector, anonymous Auth, Storage) · Drizzle · GitHub Actions workers.
- LLM: `claude-opus-5-5` writing, `claude-haiku-5-5` bulk; Voyage embeddings. App boots in `LLM_MODE=fixture` with no secrets.
- PDF: Chromium `page.pdf()` on the print route, with no Paged.js — Chromium's native `@page` margin boxes and CSS columns are enough. `playwright-core` locally, `@sparticuz/chromium` on Vercel. Fallback: `/print/[id]` + browser Print.
- npm on Node 24; `typecheck` runs `next typegen` first (CI has no `.next/types`).
- Vercel: `outputFileTracingIncludes` keys are picomatch globs (`/api/pdf/*`, not `[editionId]`); playwright-core needs its whole package traced.
- Next 16 `cacheComponents` + partial prefetching are on: avoid uncached `new Date()`/request data outside Suspense; `dynamicParams` is unavailable.

## Known issues

- Vercel needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, then a redeploy, for "Start my paper" to work in production (otherwise it shows a friendly "not configured" message).
- `e2e/start.spec.ts` creates a real anonymous user per run (no cleanup yet); RLS and start tests skip in CI (no Supabase secrets there).
- With partial prefetching, an unknown `/paper/[id]` can return HTTP 200 (shell) before `notFound()` streams. Content is correct; revisit when M7 makes editions per-user and request-time.
- `npm audit` reports high-severity advisories in scaffold dev dependencies; review before deploy hardening.
- PDF @page header/footer fall back to a sans font on Vercel (no Georgia); use an embedded webfont in M13.
- Git author is set locally to the account email with a placeholder name.

## Next action

User adds `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` (.env.local + GitHub secrets). Then: run `npm run cluster` with Voyage, calibrate `THRESHOLDS["voyage-4-lite"]` on the labelled pairs (target ≥ 90%), then M4b LLM enrichment (adjudicator, topics, concepts, fact ledger, briefs).

## Archive — requested M11 (PLAN.md M12)

- **Interface and offline verification ready; production acceptance pending backend integration.** Editorial archive rows, edition metadata, historical banners, navigation, loading/empty/error/invalid-ID states, and responsive layouts. Saved sections/stories render in their stored order, including mixed tiers. No ranking or preference reconstruction.
- Files: `src/app/archive/**`, `src/app/paper/page.tsx`, `src/components/archive/**`, archive changes in `src/components/paper/paper-view.tsx`, `src/lib/edition/archive{,-load,.test}.ts`, `src/fixtures/archive-preview.ts`, `e2e/archive.spec.ts`, `ARCHIVE-CONTRACT.md`, and this status note.
- Verification: `npm run check` passed (58 unit tests in the latest shared checkout); production build passed; Chromium development suite (archive + existing paper/smoke, 2 workers) passed 12 tests with 1 production-only skip; production suite passed 9 with 4 development-preview skips. Opened two local historical snapshots, reloaded them without order changes, checked mobile width and empty/invalid states, and visually inspected desktop/mobile screenshots. No live reader history was fabricated or database writes performed by this task.
- Local visual preview: `/archive/preview` (development only; production access rejected). Preview PDFs are disabled because their IDs cannot be served by the original PDF loader; `/paper/demo` and its real PDF remain working.
- Integration: `ARCHIVE-CONTRACT.md` documents the `SavedEditionReader` seam and ownership requirements. Claude added a reader-scoped Supabase archive adapter and optional shared paper-reader props during verification; these archive-facing additions are preserved. Its schema, migrations, workers and other backend work remain separate. Re-verify real persisted history, RLS, current-edition identity/routing (`/today`), and authorized historical PDF access before marking the entire archive complete. The archive adapter keeps historical PDFs disabled pending that check. UUID secrecy is not authorization.
- Scope stops at the requested archive work. Three Things recall (PLAN M11) and other milestones were not implemented by this archive task.
