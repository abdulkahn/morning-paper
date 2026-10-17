import { describe, expect, it } from "vitest";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { allStories, editionSnapshotSchema, editionStats } from "./schema";
import { formatEditionDate } from "./format";

describe("edition snapshot schema", () => {
  it("accepts the sample edition", () => {
    expect(editionSnapshotSchema.safeParse(SAMPLE_EDITION).success).toBe(true);
  });

  it("requires the lead story to have tier 'lead'", () => {
    const bad = {
      ...SAMPLE_EDITION,
      lead: { ...SAMPLE_EDITION.lead, tier: "major" },
    };
    expect(editionSnapshotSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a second lead inside a section", () => {
    const [first, ...rest] = SAMPLE_EDITION.sections;
    const bad = {
      ...SAMPLE_EDITION,
      sections: [
        { ...first, stories: [{ ...first.stories[0], tier: "lead" }] },
        ...rest,
      ],
    };
    expect(editionSnapshotSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects non-http source URLs and over-long headlines", () => {
    const lead = SAMPLE_EDITION.lead;
    expect(
      editionSnapshotSchema.safeParse({
        ...SAMPLE_EDITION,
        lead: { ...lead, sources: [{ name: "x", url: "not a url" }] },
      }).success,
    ).toBe(false);
    expect(
      editionSnapshotSchema.safeParse({
        ...SAMPLE_EDITION,
        lead: { ...lead, headline: "x".repeat(161) },
      }).success,
    ).toBe(false);
  });
});

describe("editionStats", () => {
  it("derives counts from content", () => {
    const stories = allStories(SAMPLE_EDITION);
    const stats = editionStats(SAMPLE_EDITION);
    expect(stats.stories).toBe(stories.length);
    expect(stats.sources).toBe(
      new Set(stories.flatMap((s) => s.sources.map((x) => x.name))).size,
    );
    expect(stats.readingMinutes).toBe(
      Math.round(stories.reduce((n, s) => n + s.readMinutes, 0)),
    );
  });
});

describe("formatEditionDate", () => {
  it("formats independent of server timezone", () => {
    expect(formatEditionDate("2026-10-17")).toBe("Saturday, 17 October 2026");
  });
});
