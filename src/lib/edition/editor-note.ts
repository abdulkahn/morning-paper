import { sectionName } from "@/lib/ranking/rank";

// The Editor's Note, written deterministically from what actually changed in
// the reader's model, so it can never claim something the system didn't learn.

export function editorNote(input: {
  readerName: string;
  editionNumber: number;
  weights: Record<string, number>;
  previousWeights: Record<string, number> | null;
  continuingCount: number;
  leadSection: string | null;
}): string {
  const { weights, previousWeights } = input;
  const top = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t]) => sectionName(t));
  const parts = [`Good morning, ${input.readerName}.`];

  if (!previousWeights) {
    parts.push(
      top.length
        ? `This is your first paper. I've built it around ${top.join(" and ")}, based on the headlines you chose.`
        : "This is your first paper. Tell me what you like and skip, and tomorrow's will fit you better.",
    );
  } else {
    const deltas = Object.keys({ ...weights, ...previousWeights })
      .map(
        (t) => [t, (weights[t] ?? 0.3) - (previousWeights[t] ?? 0.3)] as const,
      )
      .filter(([, d]) => Math.abs(d) >= 0.05)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const up = deltas
      .filter(([, d]) => d > 0)
      .slice(0, 2)
      .map(([t]) => sectionName(t));
    const down = deltas
      .filter(([, d]) => d < 0)
      .slice(0, 1)
      .map(([t]) => sectionName(t));
    if (up.length || down.length) {
      const learned = [
        up.length ? `you've been leaning into ${up.join(" and ")}` : null,
        down.length ? `you're less interested in ${down[0]}` : null,
      ]
        .filter(Boolean)
        .join(", and ");
      parts.push(`Since your last paper I've learned that ${learned}.`);
      if (up.length) parts.push(`Today's edition gives ${up[0]} more space.`);
    } else {
      parts.push(
        `Your interests look steady: ${top.join(" and ")} lead again.`,
      );
    }
  }

  if (input.continuingCount > 0) {
    parts.push(
      `${input.continuingCount} ${input.continuingCount === 1 ? "story you've read before has" : "stories you've read before have"} moved on — I've shown only what's new.`,
    );
  }
  return parts.join(" ");
}
