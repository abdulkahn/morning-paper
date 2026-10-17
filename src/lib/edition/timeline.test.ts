import { describe, expect, it } from "vitest";
import { storyTimeline } from "./timeline";

const at = (h: number) => new Date(Date.UTC(2026, 9, 17, h));
const f = (text: string, published: number, learned = published) => ({
  text,
  firstSeenAt: at(published),
  createdAt: at(learned),
});

describe("storyTimeline", () => {
  const asOf = at(20);

  it("needs at least two known facts", () => {
    expect(storyTimeline([f("only", 5)], undefined, asOf)).toEqual([]);
  });

  it("orders facts oldest first and marks where the reader stopped", () => {
    const out = storyTimeline([f("c", 14), f("a", 4), f("b", 8)], at(10), asOf);
    expect(out.map((e) => (e.kind === "read" ? "READ" : e.text))).toEqual([
      "a",
      "b",
      "READ",
      "c",
    ]);
    expect(out.at(-1)).toMatchObject({ isNew: true });
  });

  it("treats a late-arriving fact as new and leaves out future facts", () => {
    const out = storyTimeline(
      [f("a", 4), f("late", 9, 12), f("future", 21)],
      at(10),
      asOf,
    );
    expect(out.map((e) => (e.kind === "read" ? "READ" : e.text))).toEqual([
      "a",
      "READ",
      "late",
    ]);
  });

  it("has no read marker for a story the reader has not read", () => {
    const out = storyTimeline([f("a", 4), f("b", 8)], undefined, asOf);
    expect(out.every((e) => e.kind === "fact" && !e.isNew)).toBe(true);
  });

  it("trims the oldest background first", () => {
    const facts = Array.from({ length: 12 }, (_, i) => f(`f${i}`, i));
    const out = storyTimeline(facts, undefined, asOf, 5);
    expect(out.map((e) => (e.kind === "fact" ? e.text : ""))).toEqual([
      "f7",
      "f8",
      "f9",
      "f10",
      "f11",
    ]);
  });
});
