# The Morning Paper

A personal newspaper that remembers what you've already read, understands what you already know, and focuses tomorrow's edition on what is actually new.

- Product spec: [SPEC.md](SPEC.md)
- Milestones: [PLAN.md](PLAN.md)
- Current status: [STATUS.md](STATUS.md)
- Contributor/agent rules: [AGENTS.md](AGENTS.md)

## Stack

Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres + pgvector, Auth, Storage) · Claude (Opus 5.5 writing, Haiku 5.5 bulk) · Voyage embeddings · GitHub Actions workers · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: runs in fixture mode without keys
npm run dev
```

## Checks

```bash
npm run check        # lint + typecheck + format + unit tests
npx playwright install chromium
npm run test:e2e     # browser tests
```
