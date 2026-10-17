// Interest weights = onboarding/editor base weights + explicit feedback.
// Deterministic and replayable from the event log; one stray click can only
// move a topic a little, explicit buttons move it more.

export interface BaseWeight {
  topicSlug: string;
  baseWeight: number;
  muted: boolean;
}

export interface WeightEvent {
  type: string;
  topicSlug: string | null;
}

const SIGNAL: Record<string, number> = {
  more_like_this: 0.12,
  less_like_this: -0.15,
  story_open: 0.02,
  original_open: 0.02,
};
/** Weak signals (opens) can't move a topic more than this in total. */
const IMPLICIT_CAP = 0.08;

export function deriveWeights(base: BaseWeight[], events: WeightEvent[]) {
  const weights: Record<string, number> = {};
  const muted = new Set<string>();
  for (const b of base) {
    weights[b.topicSlug] = b.baseWeight;
    if (b.muted) muted.add(b.topicSlug);
  }
  const implicit: Record<string, number> = {};
  for (const e of events) {
    if (!e.topicSlug) continue;
    if (e.type === "mute_topic") muted.add(e.topicSlug);
    if (e.type === "unmute_topic") muted.delete(e.topicSlug);
    const delta = SIGNAL[e.type];
    if (delta === undefined) continue;
    const current = weights[e.topicSlug] ?? 0.3;
    if (e.type === "story_open" || e.type === "original_open") {
      const used = implicit[e.topicSlug] ?? 0;
      const allowed = Math.max(0, Math.min(delta, IMPLICIT_CAP - used));
      implicit[e.topicSlug] = used + allowed;
      weights[e.topicSlug] = current + allowed;
    } else {
      weights[e.topicSlug] = current + delta;
    }
  }
  for (const k of Object.keys(weights)) {
    weights[k] =
      Math.round(Math.min(1, Math.max(0.02, weights[k])) * 100) / 100;
  }
  return { weights, muted };
}
