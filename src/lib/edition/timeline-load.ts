import { eq } from "drizzle-orm";
import { storyTimeline, type TimelineEntry } from "./timeline";

/**
 * Server-only: the development timeline for one story in a stored edition.
 * Callers must already have checked that the reader owns the edition.
 * Any failure returns [] so the story page still renders.
 */
export async function loadStoryTimeline(
  editionId: string,
  clusterId: string,
  lastReadAt: string | undefined,
): Promise<TimelineEntry[]> {
  try {
    const [{ getDb }, { editions, storyFacts }] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
    ]);
    const db = getDb();
    const [edition] = await db
      .select({ asOf: editions.asOf })
      .from(editions)
      .where(eq(editions.id, editionId));
    if (!edition) return [];
    const facts = await db
      .select({
        text: storyFacts.text,
        firstSeenAt: storyFacts.firstSeenAt,
        createdAt: storyFacts.createdAt,
      })
      .from(storyFacts)
      .where(eq(storyFacts.clusterId, clusterId));
    return storyTimeline(
      facts,
      lastReadAt ? new Date(lastReadAt) : undefined,
      edition.asOf,
    );
  } catch (error) {
    console.error("story timeline unavailable", error);
    return [];
  }
}
