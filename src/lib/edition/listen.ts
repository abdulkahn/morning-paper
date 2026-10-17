import { formatEditionDate } from "./format";
import type { EditionSnapshot, StorySnapshot } from "./schema";

export type ListenPart = { label: string; text: string };

const updateLine = (s: StorySnapshot) =>
  s.continuing?.newFacts.length
    ? ` Since you last read this: ${s.continuing.newFacts.slice(0, 2).join(" ")}`
    : "";

/**
 * The paper as a spoken briefing, in reading order: greeting, editor's note,
 * the lead in full, then each section's headlines and summaries, updates to
 * followed stories, and a sign-off. Built only from the frozen snapshot.
 */
export function listenScript(edition: EditionSnapshot): ListenPart[] {
  const lead = edition.lead;
  const parts: ListenPart[] = [
    {
      label: "Welcome",
      text: `Good morning, ${edition.readerName}. This is The Morning Paper for ${formatEditionDate(edition.date)}.`,
    },
  ];
  if (edition.editorNote)
    parts.push({ label: "From your editor", text: edition.editorNote });
  parts.push({
    label: lead.headline,
    text: `Top story. ${lead.headline}. ${lead.dek}${updateLine(lead)} ${lead.brief.join(" ")}`,
  });
  for (const section of edition.sections) {
    section.stories.forEach((s, i) =>
      parts.push({
        label: s.headline,
        text: `${i === 0 ? `In ${section.title}. ` : ""}${s.headline}. ${s.dek}${updateLine(s)}`,
      }),
    );
  }
  parts.push({
    label: "Sign-off",
    text: "That's your paper. You're caught up. See you tomorrow morning.",
  });
  return parts;
}
