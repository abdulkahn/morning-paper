# STATUS

_Last updated: 2026-10-17_

## Completed

- **M0** — Next.js 16.4 + TypeScript + Tailwind 4 scaffold, ESLint + Prettier, Vitest, Playwright, GitHub Actions CI, Zod env schema, docs. Repo: https://github.com/abdulkahn/morning-paper
- **M1** — `EditionSnapshot` content model (`src/lib/edition/schema.ts`), sample edition fixture, web paper `/paper/[editionId]`, print layout `/print/[editionId]`, PDF route `/api/pdf/[editionId]`. Local PDF: 2 A4 pages, 3 columns, running header, "Page X of Y" via `@page` margin boxes, ~350 KB locally. Deployed at https://morning-paper-mocha.vercel.app — PDF verified on Vercel (244 KB, ~2.8 s warm) via @sparticuz/chromium.

## In progress

- Nothing. Next: **M2** (Drizzle schema, migrations, RLS, topics seed, Supabase anonymous auth).

## Decisions

- Stack: Next.js on Vercel · Supabase (Postgres + pgvector, anonymous Auth, Storage) · Drizzle · GitHub Actions workers.
- LLM: `claude-opus-5-5` writing, `claude-haiku-5-5` bulk; Voyage embeddings. App boots in `LLM_MODE=fixture` with no secrets.
- PDF: Chromium `page.pdf()` on the print route, with no Paged.js — Chromium's native `@page` margin boxes and CSS columns are enough. `playwright-core` locally, `@sparticuz/chromium` on Vercel. Fallback: `/print/[id]` + browser Print.
- npm on Node 24; `typecheck` runs `next typegen` first (CI has no `.next/types`).
- Vercel: `outputFileTracingIncludes` keys are picomatch globs (`/api/pdf/*`, not `[editionId]`); playwright-core needs its whole package traced.
- Next 16 `cacheComponents` + partial prefetching are on: avoid uncached `new Date()`/request data outside Suspense; `dynamicParams` is unavailable.

## Known issues

- With partial prefetching, an unknown `/paper/[id]` can return HTTP 200 (shell) before `notFound()` streams. Content is correct; revisit when M7 makes editions per-user and request-time.
- `npm audit` reports high-severity advisories in scaffold dev dependencies; review before deploy hardening.
- PDF @page header/footer fall back to a sans font on Vercel (no Georgia); use an embedded webfont in M13.
- Git author is set locally to the account email with a placeholder name.

## Next action

M2: create a Supabase project (user), add Drizzle schema + migrations + RLS, anonymous auth, topics seed.
