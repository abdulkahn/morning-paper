import { describe, expect, it } from "vitest";
import { keywordParse, planChanges } from "./talk";

describe("keywordParse", () => {
  it("keeps each direction local to its clause", () => {
    const p = keywordParse(
      "Less US politics, more Pakistani startups and AI research",
    );
    expect(p.changes).toEqual(
      expect.arrayContaining([
        { topic: "politics", direction: "less", strength: "moderate" },
        { topic: "startups", direction: "more", strength: "moderate" },
        { topic: "pakistan", direction: "more", strength: "moderate" },
        { topic: "ai", direction: "more", strength: "moderate" },
      ]),
    );
  });

  it("mutes on 'no' and ignores unrelated text", () => {
    expect(keywordParse("no crypto please").changes).toEqual([
      { topic: "crypto", direction: "mute", strength: "moderate" },
    ]);
    expect(keywordParse("hello there").changes).toEqual([]);
  });
});

describe("planChanges", () => {
  it("applies bounded steps and reports before/after", () => {
    const diff = planChanges(
      {
        reply: "",
        changes: [
          { topic: "politics", direction: "less", strength: "strong" },
          { topic: "ai", direction: "more", strength: "strong" },
          { topic: "crypto", direction: "mute", strength: "slight" },
        ],
      },
      { politics: 0.45, ai: 0.9 },
      new Set(),
    );
    expect(diff).toEqual([
      expect.objectContaining({ topic: "politics", before: 0.45, after: 0.2 }),
      expect.objectContaining({ topic: "ai", before: 0.9, after: 1 }),
      expect.objectContaining({
        topic: "crypto",
        mutedBefore: false,
        mutedAfter: true,
      }),
    ]);
  });

  it("drops no-op changes and caps the number of changes", () => {
    const diff = planChanges(
      {
        reply: "",
        changes: [{ topic: "ai", direction: "more", strength: "slight" }],
      },
      { ai: 1 },
      new Set(),
    );
    expect(diff).toEqual([]);
  });
});
