# STATUS

_Last updated: 2026-10-17_

## Completed

- **M0** — Next.js 16.4 + TypeScript + Tailwind 4 scaffold, ESLint + Prettier, Vitest, Playwright, GitHub Actions CI, Zod env schema (`src/lib/env.ts`), `.env.example`, masthead placeholder, AGENTS/SPEC/PLAN/STATUS.

## In progress

- Nothing. Next: **M1** (UI shell, fixture edition, Vercel deploy, PDF spike).

## Decisions

- Stack: Next.js on Vercel · Supabase (Postgres + pgvector, anonymous Auth, Storage) · Drizzle · GitHub Actions workers.
- LLM: `claude-opus-5-5` writing, `claude-haiku-5-5` bulk; Voyage embeddings. App boots in `LLM_MODE=fixture` with no secrets.
- Package manager: npm (Node 24). `@types/node@24` to match.
- Next 16 has `cacheComponents` on by default — avoid uncached `new Date()` / request data in static components.

## Known issues

- `npm audit` reports 5 high-severity advisories in scaffold dev dependencies; review in M1.
- No GitHub remote yet; CI runs once the repo is pushed.
- Git author is set locally to the account email with a placeholder name.

## Next action

M1: fixture edition JSON → `/paper/demo` and `/print/demo`, Chromium PDF route, deploy to Vercel, record PDF hosting decision.
