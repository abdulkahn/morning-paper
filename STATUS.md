# STATUS

_Last updated: 2026-10-17_

## Completed

- **M0** — Next.js 16.4 + TypeScript + Tailwind 4 scaffold, ESLint + Prettier, Vitest, Playwright, GitHub Actions CI, Zod env schema, docs. Repo: https://github.com/abdulkahn/morning-paper
- **M1** — `EditionSnapshot` content model (`src/lib/edition/schema.ts`), sample edition fixture, web paper `/paper/[editionId]`, print layout `/print/[editionId]`, PDF route `/api/pdf/[editionId]`. Local PDF: 2 A4 pages, 3 columns, running header, "Page X of Y" via `@page` margin boxes, ~350 KB locally. Deployed at https://morning-paper-mocha.vercel.app — PDF verified on Vercel (244 KB, ~2.8 s warm) via @sparticuz/chromium.
- **M2** — Supabase (Postgres 17, pgvector 0.8.2, region ap-southeast-2). Drizzle schema + migrations `0000_readers_and_topics`, `0001_table_grants`: `topics` (17 seeded), `profiles`, `user_topic_base`, `events` (append-only), all with RLS + least-privilege grants. Anonymous sign-in via "Start my paper" → profile row → `/onboarding` placeholder. Session refresh in `src/proxy.ts`. RLS verified by integration tests against the live project.
- **M3** — Ingestion worker (`worker/ingest.ts`, logic in `src/lib/ingest/`): 36 probed RSS feeds (global, tech, 7 AI/robotics, 6 Pakistani, sport, science, crypto) + optional Guardian full-text API. Canonical URLs, HTML/entity cleanup, 72 h freshness window, per-source failure isolation, `pipeline_runs` log. First runs: ~726 fresh articles in ~25 s, 0 failures, re-runs idempotent. Scheduled every 2 h by `.github/workflows/ingest.yml` (needs `DATABASE_URL` repo secret).

- **M4 (reduced)** — Clustering with Voyage `voyage-4-lite` (86.8% on 129 labelled pairs, recall 0.98; hash fallback ~81%), rate-limit-aware client. AI enrichment (`worker/enrich.ts`): Opus 5.5 for the top 15 stories, Haiku 5.5 for the rest — headline, brief, why it matters, key points, concepts, timestamped facts (fact ledger), recall question; validated + deterministic fallback. Cron: ingest → cluster → enrich.
- **M5–M10 (reduced scope, see cut list)** — Transparent ranking (`src/lib/ranking`), derived interest weights, frozen per-reader daily editions (`src/lib/edition/build.ts`), onboarding headline duels, `/today`, story reader with More/Less, Since You Last Read from the fact ledger, "New to you" explainers by concept familiarity, Three Things with resurfacing, deterministic Editor's Note, real-edition PDF. `npm run demo:seed` creates clearly simulated reading history on real news. Golden-path Playwright test passes against the live project.
- **My Editor + Talk to Your Editor** (`/editor`) — interests with reasons from the event log, a "what you know" list with "I know this", followed stories, and natural-language preference changes: Claude (Haiku 5.5, structured output limited to the 17 topics and three strengths) or a keyword fallback → deterministic before/after diff → Apply shifts base weights for future editions only. Covered by the golden-path test.
- **Cut for the deadline:** LLM clustering adjudicator, implicit dwell/skip tracking, knowledge-graph visualisation, all stretch features, Guardian full text, page excerpts, PDF caching, long failure-test suite.

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

## Newspaper photographs and headline motion

- Added aligned, landscape photographs beside the lead story, above major stories, in the story reader and in the landing sample. Captions distinguish publisher-supplied images from credited illustrative topic photographs. Unsupported topics remain text-only when no publisher image exists; failed requests retain a stable, labelled placeholder.
- New edition builds reuse the existing article `image_url` field and freeze the selected URL/credit in optional snapshot metadata. Older snapshots still parse unchanged; their web presentation can show fixed, labelled robotics/technology/space topic photographs without fetching current articles or rebuilding stories. No database migration, ingestion, ranking or AI changes.
- Added a single 700 ms fade-and-rise headline entrance, disabled for reduced-motion preferences and printing. PDF layout remains text-based and uses the original saved content.
- Files: `src/lib/edition/{images.ts,images.test.ts,schema.ts,build.ts}`, `src/components/paper/{story-visual.tsx,paper-view.tsx}`, landing/story pages, `globals.css`, `e2e/visuals.spec.ts` and this note.
- Verification: `npm run check` passed (64 unit tests); production build passed; development browser suite passed 18 tests with 1 production-only skip; production suite passed 15 with 4 development-preview skips. Checked actual photo loading and desktop alignment in the browser; automated checks cover mobile overflow, image failure, credits, reduced motion, two unchanged historical editions and the existing PDF route.
- Limitations: remote image availability depends on the publisher/Unsplash; images are not copied into Storage. Existing saved editions are not backfilled with current article images. No deployment or database writes were performed.

## Continuing stories and newsroom front end

- Added **More on what you read earlier** immediately below the lead, with the saved last-read date, update count, first new development or correction, credited photograph when available, and a keyboard-accessible Read update link. This is a compact index: full stories remain in their original positions, with original lead/section/tier ordering. Standard and brief stories now also display their saved Since You Last Read details.
- The section uses only meaningful `continuing` data in the frozen edition, deduplicated by thread in saved order. It hides when there are no updates. Historical papers never query current reading activity or rebuild updates. This surfaces updates already selected for the edition; it does not add a separate recommendation pipeline or fetch every related article.
- On Today’s Paper, Read update opens the existing authenticated story reader so its read tracking can shape future editions. Sample and archived papers jump to the original story within that saved paper.
- Replaced the earlier Harvey-inspired web styling with a **Sky News-inspired newsroom**: compact red/white wordmark, bold sans-serif headlines, white canvas, functional section navigation, large lead photograph beside the headline, secondary story cards and responsive grids. The public landing content remains clearly labelled as a sample. Print typography and PDF content are retained.
- Files: shared header; paper `continuing-stories.tsx` and its rendering tests, `edition-anchor.tsx`, `paper-view.tsx`, `masthead.tsx`; landing page/styles; `src/lib/edition/{continuing.ts,continuing.test.ts}`; local archive fixtures; `e2e/{continuing,design,archive}.spec.ts`. Applied whitespace-only formatting to the concurrently modified Today page; its feature changes are excluded from this commit.
- Verification: full `npm run check` passed in the shared working tree (74 unit tests); production build passed. Development browser checks passed 21 tests with 1 production-only skip before the final navigation test; the final design/continuing slice passed all 7 tests. Final production suite passed 18 tests with 5 development-fixture skips. Fixed initial story-anchor scrolling after hydration, verified by the production navigation test. Checked actual photo rendering, update links, mobile widths, keyboard navigation, two archived editions retaining their order, an edition with no updates, and existing PDF behavior. No database, ingestion, ranking, AI or migration changes.

### Reading-updates sidebar placement

- Moved the update index to the right of the lead on desktop, directly below the sample/illustrative label on sample pages. Applied to the public sample landing and saved/current paper renderer. Mobile stacks it below the lead. Restored all original topic cards beneath the landing lead so no stories disappear when replacing the old right-hand cards.
- Reused the same frozen updates, dates and reader/archived links in a compact sidebar variant. Empty updates remain hidden. Fixed anchor restoration to follow the current hash rather than a stale initial story after a navigation click.
- Verification: full project check (74 unit tests), production build, actual browser inspection, 8 development sidebar/design tests and 7 production tests (1 local-fixture skip) passed. Checks cover right-column geometry, label placement, update links, keyboard/mobile navigation and unchanged historical ordering. Existing archive, image and PDF regression checks were also run. No backend, snapshot data or database changes.

## PDF broadsheet redesign

- The PDF (`/print/[id]` → `/api/pdf/[id]`) now looks like a printed broadsheet: blackletter nameplate with ears and dateline, "Inside today" index, lead story with a black-and-white photo, drop cap and two-column body, an editor/key-points/glossary sidebar, two second leads with photos below the fold, then sections flowing through three columns with section flags, an "In brief" box, Three Things with upside-down answers and a sign-off. Fonts are embedded webfonts (`next/font`), so Vercel no longer falls back to a sans header.
- Styles are scoped under `.np` in `src/components/paper/broadsheet.css`; the web paper is unaffected. Feed thumbnails are upgraded to print-size BBC images where possible; the renderer waits (≤8 s) for photos and drops any that fail, so a story never prints a broken image.
- Verification: `npm run check` passed (80 tests); production e2e suite 24 passed, 5 dev-fixture skips. A real reader edition renders as 3 full A4 pages with the front page filled.
