import { sectionFor } from "./rank";

// Turns onboarding answers into base interest weights. Explicit choices
// ("love" / "never show") are the strongest signal; headline duels nudge.

export const LOVE_WEIGHT = 0.85;
export const NEVER_WEIGHT = 0.02;

export interface OnboardingAnswers {
  choices: { winner: string; loser: string }[];
  loves: string[];
  nevers: string[];
}

export function onboardingWeights({
  choices,
  loves,
  nevers,
}: OnboardingAnswers) {
  const weights = new Map<string, number>();
  const muted = new Set<string>();
  const bump = (topic: string, d: number) =>
    weights.set(topic, (weights.get(topic) ?? 0.3) + d);

  for (const { winner, loser } of choices) {
    bump(winner, 0.25);
    if (sectionFor(winner) !== winner) bump(sectionFor(winner), 0.1);
    bump(loser, -0.1);
  }
  for (const topic of loves) {
    weights.set(topic, Math.max(weights.get(topic) ?? 0, LOVE_WEIGHT));
    // Loving a sub-topic (e.g. AI) also lifts its section (Technology).
    const section = sectionFor(topic);
    if (section !== topic && !nevers.includes(section)) {
      weights.set(section, Math.max(weights.get(section) ?? 0.3, 0.6));
    }
  }
  for (const topic of nevers) {
    weights.set(topic, NEVER_WEIGHT);
    muted.add(topic);
  }
  for (const [t, w] of weights) {
    weights.set(t, Math.round(Math.min(1, Math.max(0.02, w)) * 100) / 100);
  }
  return { weights, muted };
}
