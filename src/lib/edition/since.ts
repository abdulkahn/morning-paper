/**
 * Facts the reader hasn't seen: ones the paper learned after they last read
 * the story. A fact carries the article's publish time (`firstSeenAt`), but an
 * article published before the read can still reach us after it (late feeds,
 * re-enrichment), so either timestamp being after the read makes it new.
 * Facts we only learned after `asOf` are left out, keeping editions frozen.
 */
export function newFactsSince<F extends { firstSeenAt: Date; createdAt: Date }>(
  facts: F[],
  readAt: Date | undefined,
  asOf: Date,
): F[] {
  if (!readAt) return [];
  return facts.filter(
    (f) =>
      f.createdAt <= asOf && (f.firstSeenAt > readAt || f.createdAt > readAt),
  );
}
