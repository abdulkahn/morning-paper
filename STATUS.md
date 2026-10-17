# STATUS

_Last updated: 2026-10-17_

## Completed

- **M0** — Next.js 16.4 + TypeScript + Tailwind 4 scaffold, ESLint + Prettier, Vitest, Playwright, GitHub Actions CI, Zod env schema, docs. Repo: https://github.com/abdulkahn/morning-paper
- **M1 (local)** — `EditionSnapshot` content model (`src/lib/edition/schema.ts`), sample edition fixture, web paper `/paper/[editionId]`, print layout `/print/[editionId]`, PDF route `/api/pdf/[editionId]`. Local PDF: 2 A4 pages, 3 columns, running header, "Page X of Y" via `@page` margin boxes, ~350 KB, ~5–10 s.

## In progress

- M1: Vercel deployment and PDF-on-Vercel check (needs a Vercel account connected to the repo).

## Decisions

- Stack: Next.js on Vercel · Supabase (Postgres + pgvector, anonymous Auth, Storage) · Drizzle · GitHub Actions workers.
- LLM: `claude-opus-5-5` writing, `claude-haiku-5-5` bulk; Voyage embeddings. App boots in `LLM_MODE=fixture` with no secrets.
- PDF: Chromium `page.pdf()` on the print route, with no Paged.js — Chromium's native `@page` margin boxes and CSS columns are enough. `playwright-core` locally, `@sparticuz/chromium` on Vercel. Fallback: `/print/[id]` + browser Print.
- npm on Node 24; `typecheck` runs `next typegen` first (CI has no `.next/types`).
- Next 16 `cacheComponents` + partial prefetching are on: avoid uncached `new Date()`/request data outside Suspense; `dynamicParams` is unavailable.

## Known issues

- With partial prefetching, an unknown `/paper/[id]` can return HTTP 200 (shell) before `notFound()` streams. Content is correct; revisit when M7 makes editions per-user and request-time.
- `npm audit` reports high-severity advisories in scaffold dev dependencies; review before deploy hardening.
- Git author is set locally to the account email with a placeholder name.

## Next action

Connect the repo to Vercel, deploy, and download `/api/pdf/demo` from the deployed URL. If serverless Chromium fails, switch PDF rendering to the GitHub Actions worker (plan B).
