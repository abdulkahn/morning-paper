import type { StoryTier } from "@/lib/edition/schema";
import { TOPICS } from "@/lib/topics";

// Transparent, deterministic personal ranking. Every score is a weighted sum
// of named terms in [0, 1] so "why is this in my paper" is always answerable.

export interface Candidate {
  clusterId: string;
  topic: string | null;
  importance: number; // 1-5 from enrichment
  sourceCount: number;
  lastArticleAt: Date;
  /** Reader read this story before (Since You Last Read applies). */
  readBefore: boolean;
  /** Facts that appeared after the reader's last read. */
  newFactCount: number;
}

export interface ScoreBreakdown {
  interest: number;
  importance: number;
  freshness: number;
  coverage: number;
  novelty: number;
  total: number;
}

export interface Ranked extends Candidate {
  score: ScoreBreakdown;
  tier: StoryTier;
  section: string;
}

// Interest dominates: two readers with different tastes must get materially
// different papers from the same day's news. Measured with
// scripts/compare-readers.ts (opposite readers, same news).
export const WEIGHTS = {
  interest: 0.6,
  importance: 0.2,
  freshness: 0.1,
  coverage: 0.05,
  novelty: 0.05,
} as const;

/** Topics at or below this weight are treated as dislikes and left out... */
export const DISLIKE_BELOW = 0.15;
/** ...unless the story is this important (e.g. a major world event). */
export const DISLIKE_OVERRIDE_IMPORTANCE = 5;
/** Explicitly loved topics (onboarding love = 0.85) skip most of the variety
 * penalty; moderate interests still leave room for other news. */
const LOVED = 0.8;

/** Reading budget (minutes) → number of stories in the paper. */
export const STORY_COUNT: Record<number, number> = { 5: 5, 15: 12, 25: 18 };

const parentOf = new Map<string, string | null>(
  TOPICS.map((t) => [t.slug, t.parent]),
);
const nameOf = new Map<string, string>(TOPICS.map((t) => [t.slug, t.name]));

/** Section a topic is filed under (its top-level topic). */
export function sectionFor(topic: string | null): string {
  if (!topic) return "world";
  return parentOf.get(topic) ?? topic;
}

export const sectionName = (slug: string) => nameOf.get(slug) ?? "News";

export function interestFor(
  topic: string | null,
  weights: Record<string, number>,
): number {
  if (!topic) return 0.3;
  return weights[topic] ?? weights[sectionFor(topic)] ?? 0.3;
}

export function scoreCandidate(
  c: Candidate,
  weights: Record<string, number>,
  now: Date,
): ScoreBreakdown {
  const ageHours = Math.max(
    0,
    (now.getTime() - c.lastArticleAt.getTime()) / 36e5,
  );
  const interest = interestFor(c.topic, weights);
  const parts = {
    // Squared so a loved topic (0.8 -> 0.64) far outranks a neutral one
    // (0.3 -> 0.09); the breakdown reports this relevance, not the raw weight.
    interest: interest * interest,
    importance: Math.min(5, Math.max(1, c.importance)) / 5,
    freshness: Math.pow(0.5, ageHours / 18),
    coverage: Math.min(1, c.sourceCount / 4),
    novelty: c.readBefore ? Math.min(1, c.newFactCount / 3) : 1,
  };
  const total = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce(
    (sum, k) => sum + WEIGHTS[k] * parts[k],
    0,
  );
  return { ...parts, total };
}

/**
 * Picks and lays out the paper: excludes muted topics and already-read
 * stories with nothing new, applies a diversity penalty for repeated
 * sections, then assigns lead / major / standard / brief tiers.
 */
export function rankEdition(
  candidates: Candidate[],
  weights: Record<string, number>,
  muted: Set<string>,
  minutes: number,
  now: Date,
): Ranked[] {
  const count = STORY_COUNT[minutes] ?? 12;
  const pool = candidates
    .filter(
      (c) =>
        !(c.topic && (muted.has(c.topic) || muted.has(sectionFor(c.topic)))),
    )
    .filter((c) => !c.readBefore || c.newFactCount > 0)
    .filter(
      (c) =>
        interestFor(c.topic, weights) > DISLIKE_BELOW ||
        c.importance >= DISLIKE_OVERRIDE_IMPORTANCE,
    )
    .map((c) => ({ c, score: scoreCandidate(c, weights, now) }));

  const picked: { c: Candidate; score: ScoreBreakdown; adjusted: number }[] =
    [];
  const perSection = new Map<string, number>();
  while (picked.length < count && pool.length) {
    let best = -1;
    let bestScore = -Infinity;
    pool.forEach((p, i) => {
      const repeats = perSection.get(sectionFor(p.c.topic)) ?? 0;
      const loved = interestFor(p.c.topic, weights) >= LOVED;
      const adjusted = p.score.total * Math.pow(loved ? 0.97 : 0.85, repeats);
      if (adjusted > bestScore) {
        bestScore = adjusted;
        best = i;
      }
    });
    const [p] = pool.splice(best, 1);
    const section = sectionFor(p.c.topic);
    perSection.set(section, (perSection.get(section) ?? 0) + 1);
    picked.push({ ...p, adjusted: bestScore });
  }

  // Lead: highest-ranked story that is genuinely important.
  const leadIndex = Math.max(
    0,
    picked.findIndex((p) => p.c.importance >= 3),
  );
  const [lead] = picked.splice(leadIndex, 1);
  const ordered = lead ? [lead, ...picked] : picked;
  const briefFrom = Math.max(4, Math.ceil(ordered.length * 0.7));

  return ordered.map((p, i) => ({
    ...p.c,
    score: p.score,
    section: sectionFor(p.c.topic),
    tier:
      i === 0
        ? "lead"
        : i <= 3
          ? "major"
          : i < briefFrom
            ? "standard"
            : "brief",
  }));
}

/** Plain-language reason a story is in this reader's paper. */
export function whyInPaper(
  r: Ranked,
  weights: Record<string, number>,
): string | null {
  if (r.readBefore && r.newFactCount > 0) {
    return `You read this story before — ${r.newFactCount} new ${r.newFactCount === 1 ? "development" : "developments"} since.`;
  }
  const topic = r.topic ? sectionName(r.topic) : null;
  if (topic && interestFor(r.topic, weights) >= 0.7) {
    return `${topic} is one of your strongest interests.`;
  }
  if (r.importance >= 4 && r.sourceCount >= 3) {
    return `One of today's biggest stories, covered by ${r.sourceCount} sources.`;
  }
  if (topic && interestFor(r.topic, weights) >= 0.5) {
    return `You follow ${topic}.`;
  }
  return null;
}
