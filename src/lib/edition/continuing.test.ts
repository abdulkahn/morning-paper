import { describe, expect, it } from "vitest";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { allStories } from "./schema";
import { continuingStories } from "./continuing";

describe("continuing-story section", () => {
  it("only includes saved meaningful updates, without changing the snapshot", () => {
    const before = JSON.stringify(SAMPLE_EDITION);
    const result = continuingStories(SAMPLE_EDITION);
    expect(result.map((story) => story.id)).toEqual(["eu-ai-rules"]);
    expect(JSON.stringify(SAMPLE_EDITION)).toBe(before);
  });

  it("hides absent and empty updates", () => {
    const edition = structuredClone(SAMPLE_EDITION);
    allStories(edition).forEach((story) => {
      story.continuing = null;
    });
    edition.lead.continuing = {
      lastReadAt: "2026-10-14T08:00:00Z",
      newFacts: [],
      changedFacts: [],
    };
    expect(continuingStories(edition)).toEqual([]);
  });

  it("includes reversals and updates in any tier, keeping original order", () => {
    const edition = structuredClone(SAMPLE_EDITION);
    const stories = allStories(edition);
    for (const story of stories) {
      story.continuing = {
        lastReadAt: "2026-10-14T08:00:00Z",
        newFacts: [],
        changedFacts: ["Earlier guidance has changed."],
      };
    }
    expect(continuingStories(edition).map((story) => story.id)).toEqual(
      stories.map((story) => story.id),
    );
  });

  it("lists each thread once even if an older snapshot repeats it", () => {
    const edition = structuredClone(SAMPLE_EDITION);
    edition.sections[0].stories.push(
      structuredClone(edition.sections[0].stories[0]),
    );
    expect(continuingStories(edition)).toHaveLength(1);
  });
});
