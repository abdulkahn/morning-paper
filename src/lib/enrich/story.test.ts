import { describe, expect, it } from "vitest";
import { storySnapshotSchema } from "@/lib/edition/schema";
import { fallbackEnrichment } from "./story";

const long = "Investment figures were released today. ".repeat(50); // ~2,000 chars

describe("fallbackEnrichment", () => {
  it("keeps every field within the edition snapshot limits", () => {
    const e = fallbackEnrichment(
      [
        {
          source: "Wire",
          title: "A".repeat(300),
          description: long,
          publishedAt: new Date(),
        },
        {
          source: "Desk",
          title: "Second report",
          description: long,
          publishedAt: new Date(),
        },
      ],
      "business",
      [],
    );
    expect(e.brief.length).toBeGreaterThan(0);
    for (const p of e.brief) expect(p.length).toBeLessThanOrEqual(900);

    // The copy must be accepted by the snapshot schema the paper validates.
    const story = storySnapshotSchema.safeParse({
      id: "x",
      clusterId: "x",
      tier: "major",
      topic: "Business",
      headline: e.headline,
      dek: e.dek,
      whyItMatters: e.whyItMatters,
      brief: e.brief,
      keyPoints: e.keyPoints,
      whyInPaper: null,
      continuing: null,
      explainers: [],
      sources: [{ name: "Wire", url: "https://example.com/a" }],
      publishedAt: new Date().toISOString(),
      readMinutes: 1.5,
    });
    expect(story.success).toBe(true);
  });
});
