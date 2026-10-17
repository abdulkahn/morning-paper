import { describe, expect, it } from "vitest";
import { THRESHOLDS } from "./assign";
import { clusterBatch, type ArticleInput } from "./batch";
import { HASH_MODEL, hashEmbedding } from "./hash-embedding";
import { titleHash } from "@/lib/ingest/normalize";
import { keyTerms } from "./text";

let seq = 0;
const newId = () => `new-${++seq}`;

function article(id: string, title: string, hour: number): ArticleInput {
  return {
    id,
    title,
    topicHint: "pakistan",
    publishedAt: new Date(Date.UTC(2026, 9, 17, hour)),
    contentHash: titleHash(title),
    keyTerms: keyTerms(title),
    embedding: hashEmbedding(title),
  };
}

const never = async () => false;

describe("clusterBatch", () => {
  it("groups rewrites of one event and separates unrelated news", async () => {
    const { assignments, clusters, stats } = await clusterBatch(
      [
        article(
          "a1",
          "At least 34 children, teacher killed as school roof collapses in Peshawar",
          1,
        ),
        article(
          "a2",
          "Pakistan school roof collapse kills at least 34 children and teacher",
          2,
        ),
        article(
          "a3",
          "Southgate does not see return to Premier League management",
          3,
        ),
        article(
          "a4",
          "At least 34 children, teacher killed as school roof collapses in Peshawar",
          4,
        ),
      ],
      [],
      THRESHOLDS[HASH_MODEL],
      async () => true,
      newId,
    );
    expect(assignments.get("a2")).toBe(assignments.get("a1"));
    expect(assignments.get("a4")).toBe(assignments.get("a1"));
    expect(assignments.get("a3")).not.toBe(assignments.get("a1"));
    expect(clusters.size).toBe(2);
    expect(stats.created).toBe(2);
    const peshawar = clusters.get(assignments.get("a1")!)!;
    expect(peshawar.articleCount).toBe(3);
    expect(peshawar.lastArticleAt.getUTCHours()).toBe(4);
  });

  it("respects a rejecting adjudicator in the grey band", async () => {
    const { clusters } = await clusterBatch(
      [
        article(
          "b1",
          "Palestinians and US journalist injured by Israeli settlers in West Bank harvest attack",
          1,
        ),
        article(
          "b2",
          "Israeli settlers beat Palestinians and a U.S. photojournalist in West Bank attacks",
          2,
        ),
      ],
      [],
      THRESHOLDS[HASH_MODEL],
      never,
      newId,
    );
    // ~0.40 similarity (just under join) is in the review band; the adjudicator said no.
    expect(clusters.size).toBe(2);
  });

  it("joins an existing persisted cluster and keeps its identity", async () => {
    const seed = article("s", "Govt cuts petrol price by Rs3.93 per litre", 0);
    const { assignments, clusters } = await clusterBatch(
      [article("c1", "Govt cuts petrol price by Rs3.93 per litre", 5)],
      [
        {
          id: "existing",
          persisted: true,
          title: seed.title,
          topicHint: "business",
          centroid: seed.embedding,
          keyTerms: seed.keyTerms,
          contentHashes: new Set([seed.contentHash]),
          articleCount: 2,
          firstSeenAt: seed.publishedAt,
          lastArticleAt: seed.publishedAt,
          touched: false,
        },
      ],
      THRESHOLDS[HASH_MODEL],
      never,
      newId,
    );
    expect(assignments.get("c1")).toBe("existing");
    expect(clusters.get("existing")).toMatchObject({
      articleCount: 3,
      touched: true,
    });
  });
});
