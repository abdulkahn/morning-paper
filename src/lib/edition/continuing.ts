import { allStories, type EditionSnapshot } from "./schema";

/** Only developments frozen into this edition, in its original editorial order. */
export function continuingStories(edition: EditionSnapshot) {
  const seen = new Set<string>();
  return allStories(edition).filter((story) => {
    const update = story.continuing;
    if (
      !update ||
      !(update.newFacts.length || update.changedFacts.length) ||
      seen.has(story.clusterId)
    ) {
      return false;
    }
    seen.add(story.clusterId);
    return true;
  });
}

export const storyAnchorId = (storyId: string) => `story-${storyId}`;
