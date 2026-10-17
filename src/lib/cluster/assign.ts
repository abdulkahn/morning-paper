import { HASH_MODEL } from "./hash-embedding";
import { overlap } from "./text";

// Decides whether an incoming article joins an existing story cluster.
// Embedding similarity does most of the work; shared key terms (names,
// places, products) guard against generic look-alikes. Pairs in the grey
// band go to an adjudicator (LLM in M4b; deterministic rule until then).

export interface Thresholds {
  /** At or above: join if at least `joinOverlap` key terms are shared. */
  join: number;
  joinOverlap: number;
  /** Between `review` and `join`: ask the adjudicator. Below: new cluster. */
  review: number;
}

/** Calibrated per embedding model on labelled pairs (see assign.test.ts). */
export const THRESHOLDS: Record<string, Thresholds> = {
  [HASH_MODEL]: { join: 0.4, joinOverlap: 0, review: 0.3 },
  // Placeholder until calibrated against the same labelled set (M4a).
  "voyage-4-lite": { join: 0.75, joinOverlap: 1, review: 0.6 },
};

export interface ArticleSignal {
  contentHash: string;
  keyTerms: Set<string>;
}

export interface Candidate {
  clusterId: string;
  similarity: number;
  keyTerms: Set<string>;
  contentHashes: Set<string>;
}

export type Decision =
  | { action: "join"; clusterId: string; reason: "same_title" | "similar" }
  | { action: "review"; clusterId: string; similarity: number; shared: number }
  | { action: "new" };

export function decide(
  article: ArticleSignal,
  candidates: Candidate[],
  t: Thresholds,
): Decision {
  const ranked = [...candidates].sort((a, b) => b.similarity - a.similarity);
  const sameTitle = ranked.find((c) =>
    c.contentHashes.has(article.contentHash),
  );
  if (sameTitle)
    return {
      action: "join",
      clusterId: sameTitle.clusterId,
      reason: "same_title",
    };

  for (const c of ranked) {
    if (c.similarity < t.review) break;
    const shared = overlap(article.keyTerms, c.keyTerms);
    if (c.similarity >= t.join && shared >= t.joinOverlap) {
      return { action: "join", clusterId: c.clusterId, reason: "similar" };
    }
    return {
      action: "review",
      clusterId: c.clusterId,
      similarity: c.similarity,
      shared,
    };
  }
  return { action: "new" };
}

/** Deterministic adjudicator used until the LLM one exists: needs a shared key term. */
export function ruleAdjudicate(
  review: Extract<Decision, { action: "review" }>,
): boolean {
  return review.shared >= 1;
}
