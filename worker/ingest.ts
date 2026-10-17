// News ingestion worker. Runs from GitHub Actions cron and locally:
//   npm run ingest
// Fetches all sources, stores new articles, and records a pipeline_runs row.
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { articles, pipelineRuns, sources } from "../src/db/schema";
import { getEnv } from "../src/lib/env";
import { collect, httpFetcher } from "../src/lib/ingest/collect";
import { SOURCES } from "../src/lib/ingest/sources";

const CHUNK = 200;

async function main() {
  const env = getEnv();
  const db = getDb();
  const now = new Date();

  // Keep the sources table in sync with the code registry.
  await db
    .insert(sources)
    .values(
      SOURCES.map((s) => ({
        slug: s.slug,
        name: s.name,
        kind: s.kind,
        url: s.url,
        country: s.country,
        topicHint: s.topicHint,
        quality: s.quality,
      })),
    )
    .onConflictDoUpdate({
      target: sources.slug,
      set: {
        name: sql`excluded.name`,
        kind: sql`excluded.kind`,
        url: sql`excluded.url`,
        country: sql`excluded.country`,
        topicHint: sql`excluded.topic_hint`,
        quality: sql`excluded.quality`,
        updatedAt: now,
      },
    });

  const enabled = await db
    .select({ slug: sources.slug })
    .from(sources)
    .where(eq(sources.enabled, true));
  const enabledSlugs = new Set(enabled.map((s) => s.slug));
  const toFetch = SOURCES.filter((s) => enabledSlugs.has(s.slug));

  const [run] = await db
    .insert(pipelineRuns)
    .values({ kind: "ingest" })
    .returning({ id: pipelineRuns.id });

  const result = await collect(toFetch, {
    fetcher: httpFetcher(),
    now,
    guardianApiKey: env.GUARDIAN_API_KEY,
  });

  let inserted = 0;
  for (let i = 0; i < result.articles.length; i += CHUNK) {
    const rows = await db
      .insert(articles)
      .values(result.articles.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: articles.url,
        // Only ever fill in full text we didn't have; never rewrite history.
        set: {
          bodyText: sql`coalesce(${articles.bodyText}, excluded.body_text)`,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    inserted += rows.filter((r) => r.inserted).length;
  }

  for (const [slug, stats] of Object.entries(result.perSource)) {
    if (stats.disabled) continue;
    await db
      .update(sources)
      .set({ lastFetchedAt: now, lastError: stats.error ?? null })
      .where(eq(sources.slug, slug));
  }

  const attempted = Object.values(result.perSource).filter((s) => !s.disabled);
  const failed = Object.entries(result.perSource).filter(([, s]) => s.error);
  const status =
    failed.length === 0
      ? "succeeded"
      : failed.length < attempted.length
        ? "partial"
        : "failed";

  await db
    .update(pipelineRuns)
    .set({
      status,
      finishedAt: new Date(),
      stats: {
        sources: attempted.length,
        collected: result.articles.length,
        inserted,
        perSource: result.perSource,
      },
      errors: failed.map(([slug, s]) => ({ source: slug, error: s.error })),
    })
    .where(eq(pipelineRuns.id, run.id));

  console.log(
    `ingest ${status}: ${attempted.length} sources, ${result.articles.length} fresh articles, ${inserted} new, ${failed.length} failed`,
  );
  for (const [slug, s] of failed) console.log(`  failed ${slug}: ${s.error}`);
  if (status === "failed") process.exitCode = 1;
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
