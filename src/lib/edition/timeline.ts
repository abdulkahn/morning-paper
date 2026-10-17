import { newFactsSince } from "./since";

export type TimelineFact = { text: string; firstSeenAt: Date; createdAt: Date };

export type TimelineEntry =
  | { kind: "fact"; text: string; at: string; isNew: boolean }
  | { kind: "read"; at: string };

/**
 * How a story developed, oldest first, with a marker where the reader last
 * read it: facts before the marker they have seen, facts after it are new.
 * Only facts known by the edition's `asOf` appear, so past editions stay
 * frozen. Returns [] when there is too little to show a development.
 */
export function storyTimeline(
  facts: TimelineFact[],
  lastReadAt: Date | undefined,
  asOf: Date,
  limit = 10,
): TimelineEntry[] {
  const known = facts
    .filter((f) => f.createdAt <= asOf && f.firstSeenAt <= asOf)
    .sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime());
  if (known.length < 2) return [];

  const fresh = new Set(newFactsSince(known, lastReadAt, asOf));
  const seen = known.filter((f) => !fresh.has(f));
  const recent = known.filter((f) => fresh.has(f));
  // Keep the newest developments; trim the oldest background first.
  const keepSeen = seen.slice(
    Math.max(0, seen.length - (limit - recent.length)),
  );
  const fact = (f: TimelineFact, isNew: boolean): TimelineEntry => ({
    kind: "fact",
    text: f.text,
    at: f.firstSeenAt.toISOString(),
    isNew,
  });

  return [
    ...keepSeen.map((f) => fact(f, false)),
    ...(lastReadAt && recent.length
      ? [{ kind: "read" as const, at: lastReadAt.toISOString() }]
      : []),
    ...recent.slice(-limit).map((f) => fact(f, true)),
  ];
}
