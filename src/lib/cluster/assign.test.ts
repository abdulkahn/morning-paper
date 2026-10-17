import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/labelled-pairs.json";
import { decide, ruleAdjudicate, THRESHOLDS, type Candidate } from "./assign";
import { cosine, HASH_MODEL, hashEmbedding } from "./hash-embedding";
import { keyTerms } from "./text";

const t = THRESHOLDS[HASH_MODEL];

function candidate(title: string, similarity: number): Candidate {
  return {
    clusterId: "c1",
    similarity,
    keyTerms: keyTerms(title),
    contentHashes: new Set(),
  };
}

describe("decide", () => {
  it("joins on an identical normalised title regardless of similarity", () => {
    const d = decide(
      { contentHash: "h", keyTerms: new Set() },
      [{ ...candidate("x", 0.01), contentHashes: new Set(["h"]) }],
      t,
    );
    expect(d).toEqual({
      action: "join",
      clusterId: "c1",
      reason: "same_title",
    });
  });

  it("starts a new cluster when nothing is close", () => {
    expect(
      decide(
        { contentHash: "h", keyTerms: new Set() },
        [candidate("x", 0.1)],
        t,
      ),
    ).toEqual({
      action: "new",
    });
  });

  it("sends grey-band matches to review with the shared-term count", () => {
    const d = decide(
      { contentHash: "h", keyTerms: new Set(["peshawar"]) },
      [candidate("School roof collapses in Peshawar", 0.35)],
      t,
    );
    expect(d).toMatchObject({ action: "review", shared: 1 });
  });
});

// Regression guard for the offline fallback model on real labelled headlines.
// Voyage + LLM adjudication are expected to do better (M4a/M4b).
describe("hash-model clustering on labelled pairs", () => {
  it("stays at or above 78% accuracy", () => {
    let correct = 0;
    for (const p of fixture.pairs) {
      const sim = cosine(hashEmbedding(p.a), hashEmbedding(p.b));
      const d = decide(
        { contentHash: "none", keyTerms: keyTerms(p.a) },
        [candidate(p.b, sim)],
        t,
      );
      const predicted =
        d.action === "join" || (d.action === "review" && ruleAdjudicate(d));
      if (predicted === p.same) correct++;
    }
    const accuracy = correct / fixture.pairs.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.78);
  });
});
