import { decide, type Decision, type Thresholds } from "./assign";
import { cosine, normalize } from "./hash-embedding";

// Assigns a batch of new articles to story clusters entirely in memory, so a
// run needs only a few bulk queries instead of several per article.

export interface ClusterState {
  id: string;
  /** False for clusters created in this batch (need INSERT, not UPDATE). */
  persisted: boolean;
  title: string;
  topicHint: string | null;
  centroid: number[];
  keyTerms: Set<string>;
  contentHashes: Set<string>;
  articleCount: number;
  firstSeenAt: Date;
  lastArticleAt: Date;
  touched: boolean;
}

export interface ArticleInput {
  id: string;
  title: string;
  topicHint: string | null;
  publishedAt: Date;
  contentHash: string;
  keyTerms: Set<string>;
  embedding: number[];
}

export type Adjudicator = (
  article: ArticleInput,
  cluster: ClusterState,
  review: Extract<Decision, { action: "review" }>,
) => Promise<boolean>;

export interface BatchResult {
  assignments: Map<string, string>; // articleId -> clusterId
  clusters: Map<string, ClusterState>;
  stats: {
    joined: number;
    created: number;
    reviewed: number;
    reviewJoined: number;
  };
}

const MAX_KEY_TERMS = 60;
const CANDIDATES = 5;

export async function clusterBatch(
  articles: ArticleInput[],
  existing: ClusterState[],
  thresholds: Thresholds,
  adjudicate: Adjudicator,
  newId: () => string,
): Promise<BatchResult> {
  const clusters = new Map(existing.map((c) => [c.id, c]));
  const assignments = new Map<string, string>();
  const stats = { joined: 0, created: 0, reviewed: 0, reviewJoined: 0 };

  const ordered = [...articles].sort(
    (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime(),
  );

  for (const article of ordered) {
    const candidates = [...clusters.values()]
      .map((c) => ({ c, similarity: cosine(article.embedding, c.centroid) }))
      .sort((x, y) => y.similarity - x.similarity)
      .slice(0, CANDIDATES)
      .map(({ c, similarity }) => ({
        clusterId: c.id,
        similarity,
        keyTerms: c.keyTerms,
        contentHashes: c.contentHashes,
      }));
    // An identical title anywhere wins, even outside the top-k by similarity.
    for (const c of clusters.values()) {
      if (
        c.contentHashes.has(article.contentHash) &&
        !candidates.some((k) => k.clusterId === c.id)
      ) {
        candidates.push({
          clusterId: c.id,
          similarity: 0,
          keyTerms: c.keyTerms,
          contentHashes: c.contentHashes,
        });
      }
    }

    let decision = decide(article, candidates, thresholds);
    if (decision.action === "review") {
      stats.reviewed++;
      const cluster = clusters.get(decision.clusterId)!;
      if (await adjudicate(article, cluster, decision)) {
        stats.reviewJoined++;
        decision = {
          action: "join",
          clusterId: decision.clusterId,
          reason: "similar",
        };
      } else {
        decision = { action: "new" };
      }
    }

    if (decision.action === "join") {
      const c = clusters.get(decision.clusterId)!;
      const n = c.articleCount;
      c.centroid = normalize(
        c.centroid.map((v, i) => (v * n + article.embedding[i]) / (n + 1)),
      );
      c.articleCount = n + 1;
      for (const term of article.keyTerms) {
        if (c.keyTerms.size >= MAX_KEY_TERMS) break;
        c.keyTerms.add(term);
      }
      c.contentHashes.add(article.contentHash);
      if (article.publishedAt > c.lastArticleAt)
        c.lastArticleAt = article.publishedAt;
      c.topicHint ??= article.topicHint;
      c.touched = true;
      assignments.set(article.id, c.id);
      stats.joined++;
    } else {
      const c: ClusterState = {
        id: newId(),
        persisted: false,
        title: article.title,
        topicHint: article.topicHint,
        centroid: article.embedding,
        keyTerms: new Set([...article.keyTerms].slice(0, MAX_KEY_TERMS)),
        contentHashes: new Set([article.contentHash]),
        articleCount: 1,
        firstSeenAt: article.publishedAt,
        lastArticleAt: article.publishedAt,
        touched: true,
      };
      clusters.set(c.id, c);
      assignments.set(article.id, c.id);
      stats.created++;
    }
  }

  return { assignments, clusters, stats };
}
