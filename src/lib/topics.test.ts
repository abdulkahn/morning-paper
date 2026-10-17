import { describe, expect, it } from "vitest";
import { TOPICS } from "./topics";

describe("topic taxonomy", () => {
  it("has unique, url-safe slugs", () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("only references existing top-level parents", () => {
    const bySlug = new Map<string, (typeof TOPICS)[number]>(
      TOPICS.map((t) => [t.slug, t]),
    );
    for (const t of TOPICS) {
      if (t.parent === null) continue;
      const parent = bySlug.get(t.parent);
      expect(parent, `${t.slug} → ${t.parent}`).toBeDefined();
      expect(parent?.parent).toBeNull();
    }
  });
});
