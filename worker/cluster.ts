// Story clustering worker: embeds new articles and groups them into
// developing-story clusters. Runs after ingestion:
//   npm run cluster
import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { articles, pipelineRuns, storyClusters } from "../src/db/schema";
import { getEnv } from "../src/lib/env";
import { ruleAdjudicate, THRESHOLDS } from "../src/lib/cluster/assign";
import {
  clusterBatch,
  type ArticleInput,
  type ClusterState,
} from "../src/lib/cluster/batch";
import { getEmbedder } from "../src/lib/cluster/embedder";
import { keyTerms } from "../src/lib/cluster/text";

const ACTIVE_DAYS = 10;
const CHUNK = 100;

const vectorLiteral = (v: number[]) =>
  `[${v.map((x) => x.toFixed(6)).join(",")}]`;

async function main() {
  const env = getEnv();
  const db = getDb();
  const embedder = getEmbedder(env.VOYAGE_API_KEY, { log: console.log });
  const thresholds = THRESHOLDS[embedder.model];
  const started = Date.now();

  const [run] = await db
    .insert(pipelineRuns)
    .values({
      kind: "enrich",
      stats: { step: "cluster", model: embedder.model },
    })
    .returning({ id: pipelineRuns.id });

  try {
    // 0. `--rebuild`: drop clusters built with another embedding model so the
    //    recent articles are re-clustered with the current one.
    if (process.argv.includes("--rebuild")) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`
          update articles set cluster_id = null, clustered_at = null
          where cluster_id in (select id from story_clusters where embedding_model <> ${embedder.model})`);
        const dropped = await tx.execute(sql`
          delete from story_clusters where embedding_model <> ${embedder.model} returning id`);
        console.log(
          `rebuild: dropped ${dropped.length} clusters from other models`,
        );
      });
    }

    // 1. Unclustered recent articles.
    const pending = await db
      .select({
        id: articles.id,
        title: articles.title,
        description: articles.description,
        topicHint: articles.topicHint,
        publishedAt: articles.publishedAt,
        contentHash: articles.contentHash,
        embedding: articles.embedding,
        embeddingModel: articles.embeddingModel,
      })
      .from(articles)
      .where(
        and(
          isNull(articles.clusterId),
          gt(articles.publishedAt, sql`now() - interval '72 hours'`),
        ),
      )
      .limit(3000);

    // 2. Embed anything missing an embedding from the current model.
    const toEmbed = pending.filter(
      (a) => !a.embedding || a.embeddingModel !== embedder.model,
    );
    const vectors = await embedder.embed(toEmbed);
    toEmbed.forEach((a, i) => {
      a.embedding = vectors[i];
      a.embeddingModel = embedder.model;
    });

    // 3. Active clusters for this model, with the title hashes they contain.
    const active = await db
      .select()
      .from(storyClusters)
      .where(
        and(
          eq(storyClusters.embeddingModel, embedder.model),
          gt(
            storyClusters.lastArticleAt,
            sql`now() - make_interval(days => ${ACTIVE_DAYS})`,
          ),
        ),
      );
    const hashes = active.length
      ? await db
          .select({
            clusterId: articles.clusterId,
            contentHash: articles.contentHash,
          })
          .from(articles)
          .where(
            inArray(
              articles.clusterId,
              active.map((c) => c.id),
            ),
          )
      : [];
    const existing: ClusterState[] = active.map((c) => ({
      id: c.id,
      persisted: true,
      title: c.title,
      topicHint: c.topicSlug,
      centroid: c.centroid,
      keyTerms: new Set(c.keyTerms),
      contentHashes: new Set(
        hashes.filter((h) => h.clusterId === c.id).map((h) => h.contentHash),
      ),
      articleCount: c.articleCount,
      firstSeenAt: c.firstSeenAt,
      lastArticleAt: c.lastArticleAt,
      touched: false,
    }));

    // 4. Assign in memory.
    const inputs: ArticleInput[] = pending.map((a) => ({
      id: a.id,
      title: a.title,
      topicHint: a.topicHint,
      publishedAt: a.publishedAt,
      contentHash: a.contentHash,
      keyTerms: keyTerms(a.title, a.description),
      embedding: a.embedding!,
    }));
    const result = await clusterBatch(
      inputs,
      existing,
      thresholds,
      async (_a, _c, review) => ruleAdjudicate(review),
      randomUUID,
    );

    // 5. Persist everything in one transaction.
    const touched = [...result.clusters.values()].filter((c) => c.touched);
    await db.transaction(async (tx) => {
      for (let i = 0; i < toEmbed.length; i += CHUNK) {
        const rows = toEmbed.slice(i, i + CHUNK);
        await tx.execute(sql`
          update articles set embedding = v.embedding::vector, embedding_model = ${embedder.model}
          from (values ${sql.join(
            rows.map(
              (r) => sql`(${r.id}::uuid, ${vectorLiteral(r.embedding!)})`,
            ),
            sql`, `,
          )}) as v(id, embedding)
          where articles.id = v.id`);
      }

      const created = touched.filter((c) => !c.persisted);
      for (let i = 0; i < created.length; i += CHUNK) {
        await tx.insert(storyClusters).values(
          created.slice(i, i + CHUNK).map((c) => ({
            id: c.id,
            title: c.title,
            topicSlug: c.topicHint,
            embeddingModel: embedder.model,
            centroid: c.centroid,
            keyTerms: [...c.keyTerms],
            articleCount: c.articleCount,
            firstSeenAt: c.firstSeenAt,
            lastArticleAt: c.lastArticleAt,
          })),
        );
      }

      const updated = touched.filter((c) => c.persisted);
      for (let i = 0; i < updated.length; i += CHUNK) {
        const rows = updated.slice(i, i + CHUNK);
        await tx.execute(sql`
          update story_clusters set
            centroid = v.centroid::vector,
            key_terms = v.key_terms::text[],
            article_count = v.article_count::int,
            last_article_at = v.last_article_at::timestamptz,
            topic_slug = coalesce(story_clusters.topic_slug, v.topic_slug),
            updated_at = now()
          from (values ${sql.join(
            rows.map(
              (c) =>
                sql`(${c.id}::uuid, ${vectorLiteral(c.centroid)}, ${`{${[...c.keyTerms].map((t) => `"${t.replace(/["\\]/g, "")}"`).join(",")}}`}, ${c.articleCount}, ${c.lastArticleAt.toISOString()}, ${c.topicHint})`,
            ),
            sql`, `,
          )}) as v(id, centroid, key_terms, article_count, last_article_at, topic_slug)
          where story_clusters.id = v.id`);
      }

      const assigned = [...result.assignments.entries()];
      for (let i = 0; i < assigned.length; i += CHUNK) {
        await tx.execute(sql`
          update articles set cluster_id = v.cluster_id::uuid, clustered_at = now()
          from (values ${sql.join(
            assigned
              .slice(i, i + CHUNK)
              .map(([a, c]) => sql`(${a}::uuid, ${c})`),
            sql`, `,
          )}) as v(id, cluster_id)
          where articles.id = v.id`);
      }

      if (touched.length) {
        await tx.execute(sql`
          update story_clusters sc set source_count = sub.n
          from (
            select a.cluster_id, count(distinct s.name)::int as n
            from articles a join sources s on s.slug = a.source_slug
            where a.cluster_id = any(${`{${touched.map((c) => c.id).join(",")}}`}::uuid[])
            group by a.cluster_id
          ) sub
          where sc.id = sub.cluster_id`);
      }
    });

    const stats = {
      step: "cluster",
      model: embedder.model,
      articles: pending.length,
      embedded: toEmbed.length,
      activeClusters: active.length,
      ...result.stats,
      seconds: Math.round((Date.now() - started) / 1000),
    };
    await db
      .update(pipelineRuns)
      .set({ status: "succeeded", finishedAt: new Date(), stats })
      .where(eq(pipelineRuns.id, run.id));
    console.log(`cluster succeeded:`, stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(pipelineRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errors: [{ error: message.slice(0, 500) }],
      })
      .where(eq(pipelineRuns.id, run.id));
    throw error;
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
