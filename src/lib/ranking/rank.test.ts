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

describe("personalisation strength", () => {
  // A realistic day: a few huge general stories plus niche topics.
  const topics = [
    "ai",
    "robotics",
    "technology",
    "football",
    "cricket",
    "sport",
    "world",
    "pakistan",
    "health",
    "business",
    "politics",
    "culture",
  ];
  const day: Candidate[] = topics.flatMap((t, ti) =>
    Array.from({ length: 4 }, (_, k) =>
      c(`${t}-${k}`, t, {
        importance: (ti + k) % 3 === 0 ? 5 : 3,
        sourceCount: 1 + ((ti + k) % 5),
        lastArticleAt: new Date(NOW.getTime() - ((ti * 4 + k) % 20) * 36e5),
      }),
    ),
  );

  it("gives opposite readers mostly different papers", () => {
    const techie = rankEdition(
      day,
      { ai: 0.85, robotics: 0.85, technology: 0.85, sport: 0.02 },
      new Set(["sport"]),
      15,
      NOW,
    );
    const fan = rankEdition(
      day,
      { football: 0.85, sport: 0.85, ai: 0.02, technology: 0.02 },
      new Set(["ai", "technology"]),
      15,
      NOW,
    );
    const shared = techie.filter((r) =>
      fan.some((f) => f.clusterId === r.clusterId),
    );
    expect(shared.length).toBeLessThanOrEqual(3);
    expect(techie[0].topic).toMatch(/ai|robotics|technology/);
    expect(fan[0].topic).toMatch(/football|cricket|sport/);
  });

  it("leaves out disliked topics unless the story is top importance", () => {
    const out = rankEdition(day, { culture: 0.05 }, new Set(), 25, NOW);
    for (const r of out.filter((x) => x.topic === "culture")) {
      expect(r.importance).toBe(5);
    }
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

describe("follow-up stories", () => {
  const followed = c("old", "world", {
    readBefore: true,
    newFactCount: 2,
    importance: 2,
    lastArticleAt: new Date("2026-10-15T06:00:00Z"),
  });

  it("keeps an update to a story the reader read, even when it ranks low", () => {
    const out = rankEdition(
      [...pool, followed],
      { ai: 0.9 },
      new Set(),
      5,
      NOW,
    );
    expect(out).toHaveLength(5);
    const story = out.find((r) => r.clusterId === "old");
    expect(story).toBeDefined();
    expect(story!.tier).not.toBe("brief");
  });

  it("holds at most two places for follow-ups", () => {
    const many = ["f1", "f2", "f3"].map((id) =>
      c(id, "world", { readBefore: true, newFactCount: 1, importance: 1 }),
    );
    const out = rankEdition([...pool, ...many], {}, new Set(), 5, NOW);
    expect(out.filter((r) => r.readBefore)).toHaveLength(2);
  });

  it("still drops read stories with nothing new and muted follow-ups", () => {
    const stale = c("stale", "world", { readBefore: true, newFactCount: 0 });
    const out = rankEdition(
      [...pool, stale, followed],
      {},
      new Set(["world"]),
      5,
      NOW,
    );
    expect(out.map((r) => r.clusterId)).not.toContain("stale");
    expect(out.map((r) => r.clusterId)).not.toContain("old");
  });
});
