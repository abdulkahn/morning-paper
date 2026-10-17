import { describe, expect, it } from "vitest";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { editionSnapshotSchema } from "./schema";
import { selectStoryImage, storyImageSchema, topicImage } from "./images";

describe("edition photographs", () => {
  it("chooses the first valid publisher image, keeping its attribution", () => {
    expect(
      selectStoryImage("Robotics", [
        {
          imageUrl: "http://example.com/insecure.jpg",
          name: "First",
          url: "https://example.com/first",
        },
        {
          imageUrl: "https://example.com/report.jpg",
          name: "Reporter",
          url: "https://example.com/report",
        },
      ]),
    ).toEqual({
      url: "https://example.com/report.jpg",
      alt: "Image supplied by Reporter for this story",
      credit: "Reporter",
      creditUrl: "https://example.com/report",
      kind: "publisher",
    });
  });

  it("uses a labelled deterministic topic photo only for supported topics", () => {
    expect(selectStoryImage("Robotics", [])).toEqual(topicImage("Robotics"));
    expect(topicImage("Robotics")?.kind).toBe("topic");
    expect(topicImage("Semiconductors")?.alt).toContain("circuit board");
    expect(topicImage("Unknown topic")).toBeNull();
  });

  it("rejects script URLs, credentials and oversized untrusted metadata", () => {
    const valid = topicImage("Robotics")!;
    for (const url of [
      "javascript:alert(1)",
      "data:image/svg+xml,test",
      "https://user:pass@example.com/photo.jpg",
      `https://example.com/${"x".repeat(2048)}`,
    ]) {
      expect(storyImageSchema.safeParse({ ...valid, url }).success).toBe(false);
    }
    expect(
      storyImageSchema.safeParse({ ...valid, creditUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      storyImageSchema.safeParse({ ...valid, alt: "x".repeat(241) }).success,
    ).toBe(false);
  });

  it("keeps legacy snapshots unchanged and round-trips saved image choices", () => {
    expect(editionSnapshotSchema.parse(SAMPLE_EDITION)).toEqual(SAMPLE_EDITION);
    expect(editionSnapshotSchema.parse(SAMPLE_EDITION).lead).not.toHaveProperty(
      "image",
    );
    const saved = {
      ...SAMPLE_EDITION,
      lead: { ...SAMPLE_EDITION.lead, image: topicImage("Robotics") },
    };
    expect(
      editionSnapshotSchema.parse(JSON.parse(JSON.stringify(saved))),
    ).toEqual(saved);
  });
});
