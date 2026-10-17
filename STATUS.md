# STATUS

_Last updated: 2026-10-17_

## Completed

- **M0** — Next.js 16.4 + TypeScript + Tailwind 4 scaffold, ESLint + Prettier, Vitest, Playwright, GitHub Actions CI, Zod env schema, docs. Repo: https://github.com/abdulkahn/morning-paper
- **M1** — `EditionSnapshot` content model (`src/lib/edition/schema.ts`), sample edition fixture, web paper `/paper/[editionId]`, print layout `/print/[editionId]`, PDF route `/api/pdf/[editionId]`. Local PDF: 2 A4 pages, 3 columns, running header, "Page X of Y" via `@page` margin boxes, ~350 KB locally. Deployed at https://morning-paper-mocha.vercel.app — PDF verified on Vercel (244 KB, ~2.8 s warm) via @sparticuz/chromium.
- **M2** — Supabase (Postgres 17, pgvector 0.8.2, region ap-southeast-2). Drizzle schema + migrations `0000_readers_and_topics`, `0001_table_grants`: `topics` (17 seeded), `profiles`, `user_topic_base`, `events` (append-only), all with RLS + least-privilege grants. Anonymous sign-in via "Start my paper" → profile row → `/onboarding` placeholder. Session refresh in `src/proxy.ts`. RLS verified by integration tests against the live project.
- **M3** — Ingestion worker (`worker/ingest.ts`, logic in `src/lib/ingest/`): 36 probed RSS feeds (global, tech, 7 AI/robotics, 6 Pakistani, sport, science, crypto) + optional Guardian full-text API. Canonical URLs, HTML/entity cleanup, 72 h freshness window, per-source failure isolation, `pipeline_runs` log. First runs: ~726 fresh articles in ~25 s, 0 failures, re-runs idempotent. Scheduled every 2 h by `.github/workflows/ingest.yml` (needs `DATABASE_URL` repo secret).

- **M4 (reduced)** — Clustering with Voyage `voyage-4-lite` (86.8% on 129 labelled pairs, recall 0.98; hash fallback ~81%), rate-limit-aware client. AI enrichment (`worker/enrich.ts`): Opus 5.5 for the top 15 stories, Haiku 5.5 for the rest — headline, brief, why it matters, key points, concepts, timestamped facts (fact ledger), recall question; validated + deterministic fallback. Cron: ingest → cluster → enrich.
- **M5–M10 (reduced scope, see cut list)** — Transparent ranking (`src/lib/ranking`), derived interest weights, frozen per-reader daily editions (`src/lib/edition/build.ts`), onboarding headline duels, `/today`, story reader with More/Less, Since You Last Read from the fact ledger, "New to you" explainers by concept familiarity, Three Things with resurfacing, deterministic Editor's Note, real-edition PDF. `npm run demo:seed` creates clearly simulated reading history on real news. Golden-path Playwright test passes against the live project.
- **Cut for the deadline:** Talk to Your Editor, LLM clustering adjudicator, implicit dwell/skip tracking, knowledge-graph visualisation, all stretch features, Guardian full text, page excerpts, PDF caching, long failure-test suite.

## In progress

- Deploy verification on Vercel (DATABASE_URL added by user), README + architecture diagram, demo rehearsal.

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

Verify the live site end to end (start → onboarding → today → story → PDF), run `npm run demo:seed` for the demo reader, record the Loom.

## Archive — requested M11 (PLAN.md M12)

- **Reconciled with the user's reduced scope.** Reused the original archive; rows show date, lead headline, story count/read time, current/historical status and Open/PDF capability. Removed duplicate title and source-count display. Saved lead, sections, tiers and story ordering remain untouched.
- Reviewed `main` at `130965c` against archive commit `1df979e`; newer edition-builder and golden-path changes were preserved. No changes to schema, migrations, ingestion, ranking, AI providers, scheduled jobs or environment variables.
- Reader-scoped Supabase queries load saved snapshots under RLS. Direct opening queries just the requested ID. Today's marker uses the reader's saved timezone, so yesterday's latest edition stays archived. `/today` remains the existing current-paper flow; `/paper` now redirects there.
- **Web design refreshed using Harvey as a reference:** light canvas, generous spacing, regular serif headlines, sans-serif navigation, thin rules and black actions. Shared header, landing page, paper masthead and lean archive use the same visual language. Original print typography is retained and web navigation is hidden in PDFs.
- Files: shared web `layout.tsx`/`globals.css`/`site-header.tsx`, landing/start presentation, paper components, archive views/error navigation, `/paper` alias, archive adapter/date helpers and unit tests, `e2e/{archive,design,smoke}.spec.ts`, `ARCHIVE-CONTRACT.md`, and this note. No new external dependencies.
- Verification: `npm run check` passed (60 unit tests); production build passed; Chromium development suite passed 15 tests with 1 production-only skip; production suite passed 12 with 4 development-preview skips. Visually inspected the landing, newspaper and archive; checked mobile width, keyboard navigation, two historical samples, reload ordering, empty/invalid/error states and existing PDF/print behavior. Local preview remains `/archive/preview`, clearly labelled and development-only.
- Limitations: historical PDF actions remain disabled pending verification of reader-authorized downloads; `/api/pdf/demo` works. Local fixtures are not proof of live multi-reader RLS or live historical PDFs. No database writes, deployments or unrelated feature work were performed for this reconciliation.
