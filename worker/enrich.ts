// Story enrichment worker: writes headline/brief/facts/concepts for the top
// recent stories that are new or have grown since last enriched.
//   npm run enrich            (top 60)
//   npm run enrich -- --limit 10
import Anthropic from "@anthropic-ai/sdk";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import {
  articles,
  clusterConcepts,
  concepts,
  pipelineRuns,
  sources,
  storyClusters,
  storyFacts,
} from "../src/db/schema";
import { getEnv } from "../src/lib/env";
import { enrichStory } from "../src/lib/enrich/story";
import type { TopicSlug } from "../src/lib/topics";

const WRITER_TOP_N = 15;
const CONCURRENCY = 4;

function argValue(name: string, fallback: number) {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
}

async function main() {
  const env = getEnv();
  const db = getDb();
  const limit = argValue("--limit", 60);
  const client =
    env.LLM_MODE === "live" && env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 })
      : null;
  const started = Date.now();

  const [run] = await db
    .insert(pipelineRuns)
    .values({ kind: "enrich", stats: { step: "enrich" } })
    .returning({ id: pipelineRuns.id });

  // Biggest, freshest, multi-source stories first; skip unchanged ones.
  const candidates = (await db.execute(sql`
    select id, topic_slug from story_clusters
    where last_article_at > now() - interval '48 hours'
      and (enriched_at is null or enriched_article_count < article_count)
    order by source_count * 3 + article_count
      - extract(epoch from now() - last_article_at) / 21600 desc
    limit ${limit}`)) as unknown as { id: string; topic_slug: string | null }[];

  let llm = 0;
  let fallback = 0;
  let failed = 0;
  let next = 0;

  async function processOne(rank: number, c: (typeof candidates)[number]) {
    const rows = await db
      .select({
        source: sources.name,
        title: articles.title,
        description: articles.description,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .innerJoin(sources, eq(sources.slug, articles.sourceSlug))
      .where(eq(articles.clusterId, c.id))
      // The newest 8, so a growing story's latest developments become facts.
      .orderBy(desc(articles.publishedAt))
      .limit(8)
      .then((r) => r.reverse());
    if (!rows.length) return;
    const known = await db
      .select({ text: storyFacts.text })
      .from(storyFacts)
      .where(eq(storyFacts.clusterId, c.id));
    const articleCount = rows.length;

    const e = await enrichStory(rows, c.topic_slug as TopicSlug | null, known, {
      client,
      model: rank < WRITER_TOP_N ? env.LLM_WRITER_MODEL : env.LLM_BULK_MODEL,
      log: (m) => console.log(`  [${c.id.slice(0, 8)}] ${m}`),
    });
    if (e.source === "llm") llm++;
    else fallback++;

    await db.transaction(async (tx) => {
      await tx
        .update(storyClusters)
        .set({
          headline: e.headline,
          dek: e.dek,
          brief: e.brief,
          whyItMatters: e.whyItMatters,
          keyPoints: e.keyPoints,
          importance: e.importance,
          topicSlug: e.topic ?? c.topic_slug,
          enrichedAt: new Date(),
          enrichedArticleCount: sql`greatest(${articleCount}, article_count)`,
          updatedAt: new Date(),
        })
        .where(eq(storyClusters.id, c.id));

      if (e.concepts.length) {
        await tx
          .insert(concepts)
          .values(e.concepts)
          .onConflictDoNothing({ target: concepts.slug });
        const ids = await tx
          .select({ id: concepts.id })
          .from(concepts)
          .where(
            inArray(
              concepts.slug,
              e.concepts.map((x) => x.slug),
            ),
          );
        await tx
          .insert(clusterConcepts)
          .values(ids.map(({ id }) => ({ clusterId: c.id, conceptId: id })))
          .onConflictDoNothing();
      }

      if (e.newFacts.length) {
        await tx.insert(storyFacts).values(
          e.newFacts.map((f) => ({
            clusterId: c.id,
            text: f.text,
            importance: f.importance,
            firstSeenAt: f.firstSeenAt,
            recall: f.recall,
          })),
        );
      }
    });
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < candidates.length) {
        const rank = next++;
        try {
          await processOne(rank, candidates[rank]);
        } catch (error) {
          failed++;
          console.error(
            `  [${candidates[rank].id.slice(0, 8)}] failed:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }),
  );

  const stats = {
    step: "enrich",
    mode: client ? "live" : "fixture",
    candidates: candidates.length,
    llm,
    fallback,
    failed,
    seconds: Math.round((Date.now() - started) / 1000),
  };
  await db
    .update(pipelineRuns)
    .set({
      status:
        failed === 0
          ? "succeeded"
          : failed < candidates.length
            ? "partial"
            : "failed",
      finishedAt: new Date(),
      stats,
    })
    .where(eq(pipelineRuns.id, run.id));
  console.log("enrich done:", JSON.stringify(stats));
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
