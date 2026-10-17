import { describe, expect, it } from "vitest";
import { newFactsSince } from "./since";

const at = (h: number) => new Date(Date.UTC(2026, 9, 17, h));
const fact = (text: string, published: number, learned: number) => ({
  text,
  firstSeenAt: at(published),
  createdAt: at(learned),
});

describe("newFactsSince", () => {
  const readAt = at(10);
  const asOf = at(20);

  it("returns nothing for a story the reader never read", () => {
    expect(newFactsSince([fact("a", 12, 12)], undefined, asOf)).toEqual([]);
  });

  it("keeps facts published after the read", () => {
    const facts = [fact("old", 8, 8), fact("new", 12, 12)];
    expect(newFactsSince(facts, readAt, asOf).map((f) => f.text)).toEqual([
      "new",
    ]);
  });

  it("keeps facts published earlier but only learned after the read", () => {
    const facts = [fact("late feed", 9, 11)];
    expect(newFactsSince(facts, readAt, asOf)).toHaveLength(1);
  });

  it("ignores facts learned after the edition's moment", () => {
    const facts = [fact("tomorrow", 21, 21), fact("late", 9, 22)];
    expect(newFactsSince(facts, readAt, asOf)).toEqual([]);
  });
});
