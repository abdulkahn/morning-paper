import { describe, expect, it } from "vitest";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { allStories } from "./schema";
import { listenScript } from "./listen";

describe("listenScript", () => {
  const parts = listenScript(SAMPLE_EDITION);

  it("greets the reader and ends with a sign-off", () => {
    expect(parts[0].text).toContain(SAMPLE_EDITION.readerName);
    expect(parts.at(-1)!.label).toBe("Sign-off");
  });

  it("reads every story once, lead first", () => {
    const headlines = allStories(SAMPLE_EDITION).map((s) => s.headline);
    const read = parts.filter((p) => headlines.includes(p.label));
    expect(read.map((p) => p.label)).toEqual(headlines);
    expect(read[0].text).toMatch(/^Top story\./);
  });

  it("mentions what is new in followed stories", () => {
    const followed = allStories(SAMPLE_EDITION).find(
      (s) => s.continuing?.newFacts.length,
    )!;
    const part = parts.find((p) => p.label === followed.headline)!;
    expect(part.text).toContain("Since you last read this");
  });
});
