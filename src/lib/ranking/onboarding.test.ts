import { describe, expect, it } from "vitest";
import { onboardingWeights } from "./onboarding";

describe("onboardingWeights", () => {
  it("makes explicit loves strong and nevers muted", () => {
    const { weights, muted } = onboardingWeights({
      choices: [{ winner: "world", loser: "technology" }],
      loves: ["ai", "robotics"],
      nevers: ["sport"],
    });
    expect(weights.get("ai")).toBe(0.85);
    expect(weights.get("robotics")).toBe(0.85);
    expect(weights.get("technology")).toBe(0.6); // lifted by its loved sub-topics
    expect(weights.get("sport")).toBe(0.02);
    expect(muted.has("sport")).toBe(true);
  });

  it("works with no duel choices (no hidden default bias)", () => {
    const { weights } = onboardingWeights({
      choices: [],
      loves: [],
      nevers: [],
    });
    expect(weights.size).toBe(0);
  });

  it("never overrides a never with a section lift", () => {
    const { weights, muted } = onboardingWeights({
      choices: [],
      loves: ["football"],
      nevers: ["sport"],
    });
    expect(weights.get("football")).toBe(0.85);
    expect(weights.get("sport")).toBe(0.02);
    expect(muted.has("sport")).toBe(true);
  });
});
