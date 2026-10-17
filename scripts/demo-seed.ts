// Demo seed: gives an existing reader a SIMULATED day of reading history so
// "Since you last read", the Editor's Note and resurfaced recall can be shown
// in one sitting. All stories and facts are real ingested news; only the
// reader's past behaviour is simulated. Never presented as live history.
//
//   npm run demo:seed                  (most recently onboarded reader)
//   npm run demo:seed -- <userId> [hoursAgo=20]
import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import {
  clusterConcepts,
  editions,
  events,
  profiles,
  readerConcepts,
  recallAnswers,
  storyClusters,
  storyReads,
} from "../src/db/schema";
import { getOrBuildEdition } from "../src/lib/edition/build";
import { allStories } from "../src/lib/edition/schema";

async function main() {
  const db = getDb();
  const [argUser, argHours] = process.argv.slice(2);
  const hoursAgo = Number(argHours ?? 20);

  const [reader] = argUser
    ? await db.select().from(profiles).where(eq(profiles.userId, argUser))
    : await db
        .select()
        .from(profiles)
        .where(isNotNull(profiles.onboardedAt))
        .orderBy(desc(profiles.onboardedAt))
        .limit(1);
  if (!reader) throw new Error("no onboarded reader found");
  const userId = reader.userId;
  console.log(
    `seeding simulated history for ${reader.displayName} (${userId})`,
  );

  // Start clean: keep onboarding choices, drop editions and reading memory.
  await db.delete(editions).where(eq(editions.userId, userId));
  await db.delete(storyReads).where(eq(storyReads.userId, userId));
  await db.delete(readerConcepts).where(eq(readerConcepts.userId, userId));
  await db
    .delete(events)
    .where(and(eq(events.userId, userId), ne(events.type, "pair_choice")));

  // ---- Day 1: yesterday's paper ----
  const day1At = new Date(Date.now() - hoursAgo * 36e5);
  const day1 = await getOrBuildEdition(userId, { asOf: day1At });
  const stories = allStories(day1.snapshot);
  console.log(
    `day 1: edition ${day1.snapshot.number} (${day1.snapshot.date}), ${stories.length} stories`,
  );

  // Reader opens the lead and the first three section stories.
  const read = stories.slice(0, 4);
  for (const s of read) {
    await db
      .insert(storyReads)
      .values({ userId, clusterId: s.clusterId, lastReadAt: day1At });
    const cs = await db
      .select({ id: clusterConcepts.conceptId })
      .from(clusterConcepts)
      .where(eq(clusterConcepts.clusterId, s.clusterId));
    if (cs.length) {
      // Read closely (and met before): these concepts no longer need explaining.
      await db
        .insert(readerConcepts)
        .values(
          cs.map((c) => ({
            userId,
            conceptId: c.id,
            exposures: 2,
            lastSeenAt: day1At,
          })),
        )
        .onConflictDoNothing();
    }
  }
  const topics = await db
    .select({ id: storyClusters.id, topic: storyClusters.topicSlug })
    .from(storyClusters)
    .where(
      inArray(
        storyClusters.id,
        stories.map((s) => s.clusterId),
      ),
    );
  const topicOf = new Map(topics.map((t) => [t.id, t.topic]));
  await db.insert(events).values(
    read.map((s) => ({
      userId,
      type: "story_open" as const,
      topicSlug: topicOf.get(s.clusterId) ?? null,
      clusterId: s.clusterId,
      createdAt: day1At,
    })),
  );

  // Explicit feedback: more of the lead's topic, less of the last story's.
  const more = read[0];
  const less = stories[stories.length - 1];
  await db.insert(events).values([
    {
      userId,
      type: "more_like_this",
      topicSlug: topicOf.get(more.clusterId) ?? null,
      clusterId: more.clusterId,
      createdAt: day1At,
    },
    {
      userId,
      type: "more_like_this",
      topicSlug: topicOf.get(more.clusterId) ?? null,
      clusterId: more.clusterId,
      createdAt: day1At,
    },
    {
      userId,
      type: "less_like_this",
      topicSlug: topicOf.get(less.clusterId) ?? null,
      clusterId: less.clusterId,
      createdAt: day1At,
    },
  ]);

  // Three Things: first answered correctly, second missed (will resurface).
  const [q1, q2] = day1.snapshot.recall;
  const answers = [
    q1 && { factId: q1.factId, chosenIndex: q1.answerIndex, correct: true },
    q2 && {
      factId: q2.factId,
      chosenIndex: (q2.answerIndex + 1) % 4,
      correct: false,
    },
  ].filter((a): a is NonNullable<typeof a> => !!a);
  if (answers.length) {
    await db
      .insert(recallAnswers)
      .values(answers.map((a) => ({ userId, editionId: day1.id, ...a })));
  }

  // ---- Day 2: today's paper, built from the remembered history ----
  const today = await getOrBuildEdition(userId);
  const continuing = allStories(today.snapshot).filter((s) => s.continuing);
  console.log(
    `day 2: edition ${today.snapshot.number} (${today.snapshot.date})`,
  );
  console.log(`  editor's note: ${today.snapshot.editorNote}`);
  console.log(`  continuing stories: ${continuing.length}`);
  for (const s of continuing) {
    console.log(
      `   - ${s.headline}: ${s.continuing!.newFacts.length} new facts`,
    );
  }
  console.log(
    `  resurfaced recall: ${today.snapshot.recall.filter((r) => r.resurfaced).length}`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
