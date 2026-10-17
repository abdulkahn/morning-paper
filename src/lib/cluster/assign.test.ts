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

// Regression guards on real labelled headlines. Hash similarities are computed
// live; Voyage similarities were cached by `npm run cluster:calibrate`.
function accuracy(
  model: string,
  sim: (p: (typeof fixture.pairs)[number]) => number,
) {
  let correct = 0;
  for (const p of fixture.pairs) {
    const d = decide(
      { contentHash: "none", keyTerms: keyTerms(p.a) },
      [candidate(p.b, sim(p))],
      THRESHOLDS[model],
    );
    const predicted =
      d.action === "join" || (d.action === "review" && ruleAdjudicate(d));
    if (predicted === p.same) correct++;
  }
  return correct / fixture.pairs.length;
}

describe("clustering accuracy on labelled pairs (rule adjudicator)", () => {
  it("hash fallback stays at or above 78%", () => {
    const acc = accuracy(HASH_MODEL, (p) =>
      cosine(hashEmbedding(p.a), hashEmbedding(p.b)),
    );
    expect(acc).toBeGreaterThanOrEqual(0.78);
  });

  it("voyage-4-lite stays at or above 85%", () => {
    const acc = accuracy("voyage-4-lite", (p) => {
      const s = (p as { sims?: Record<string, number> }).sims?.[
        "voyage-4-lite"
      ];
      if (s === undefined) throw new Error("run npm run cluster:calibrate");
      return s;
    });
    expect(acc).toBeGreaterThanOrEqual(0.85);
  });
});
