import { describe, expect, it } from "vitest";
import {
  rankEdition,
  scoreCandidate,
  whyInPaper,
  type Candidate,
} from "./rank";

const NOW = new Date("2026-10-17T06:00:00Z");
const c = (
  id: string,
  topic: string,
  extra: Partial<Candidate> = {},
): Candidate => ({
  clusterId: id,
  topic,
  importance: 3,
  sourceCount: 2,
  lastArticleAt: new Date("2026-10-17T04:00:00Z"),
  readBefore: false,
  newFactCount: 0,
  ...extra,
});

const pool = [
  c("ai1", "ai"),
  c("ai2", "ai"),
  c("robot", "robotics"),
  c("crypto", "crypto"),
  c("football", "football"),
  c("world", "world", { importance: 5, sourceCount: 6 }),
  c("pk", "pakistan"),
];

describe("rankEdition", () => {
  it("gives two readers different leads from the same news", () => {
    const techFan = rankEdition(
      pool,
      { technology: 0.9, ai: 0.95, crypto: 0.1 },
      new Set(),
      5,
      NOW,
    );
    const sportFan = rankEdition(
      pool,
      { sport: 0.95, football: 0.95, ai: 0.1 },
      new Set(),
      5,
      NOW,
    );
    expect(techFan[0].clusterId).toMatch(/^ai/);
    expect(sportFan[0].clusterId).toBe("football");
    expect(techFan.map((r) => r.clusterId)).not.toEqual(
      sportFan.map((r) => r.clusterId),
    );
  });

  it("respects the reading budget and assigns tiers", () => {
    const out = rankEdition(pool, {}, new Set(), 5, NOW);
    expect(out).toHaveLength(5);
    expect(out[0].tier).toBe("lead");
    expect(out.filter((r) => r.tier === "lead")).toHaveLength(1);
  });

  it("excludes muted topics and read stories with nothing new", () => {
    const out = rankEdition(
      [...pool, c("old", "ai", { readBefore: true, newFactCount: 0 })],
      { ai: 1 },
      new Set(["crypto"]),
      25,
      NOW,
    );
    const ids = out.map((r) => r.clusterId);
    expect(ids).not.toContain("crypto");
    expect(ids).not.toContain("old");
  });

  it("is deterministic", () => {
    const a = rankEdition(pool, { ai: 0.8 }, new Set(), 15, NOW).map(
      (r) => r.clusterId,
    );
    const b = rankEdition(pool, { ai: 0.8 }, new Set(), 15, NOW).map(
      (r) => r.clusterId,
    );
    expect(a).toEqual(b);
  });
});

describe("scores and reasons", () => {
  it("decays freshness and explains continuing stories", () => {
    const fresh = scoreCandidate(c("a", "ai"), {}, NOW);
    const stale = scoreCandidate(
      c("b", "ai", { lastArticleAt: new Date("2026-10-15T06:00:00Z") }),
      {},
      NOW,
    );
    expect(fresh.freshness).toBeGreaterThan(stale.freshness);

    const [r] = rankEdition(
      [c("x", "ai", { readBefore: true, newFactCount: 2 })],
      {},
      new Set(),
      5,
      NOW,
    );
    expect(whyInPaper(r, {})).toBe(
      "You read this story before — 2 new developments since.",
    );
  });
});
