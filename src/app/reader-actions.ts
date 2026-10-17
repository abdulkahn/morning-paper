"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  clusterConcepts,
  editions,
  events,
  profiles,
  readerConcepts,
  recallAnswers,
  storyClusters,
  storyFacts,
  storyReads,
  userTopicBase,
} from "@/db/schema";
import { editionSnapshotSchema } from "@/lib/edition/schema";
import { sectionFor } from "@/lib/ranking/rank";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TOPIC_SLUGS } from "@/lib/topics";

// Reader actions. Every action verifies the Supabase session first, then
// writes with the server connection scoped to that verified user id.

async function requireUser(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user.id;
}

async function ownedEdition(userId: string, editionId: string) {
  const [row] = await getDb()
    .select({ asOf: editions.asOf, snapshot: editions.snapshot })
    .from(editions)
    .where(and(eq(editions.id, editionId), eq(editions.userId, userId)));
  if (!row) throw new Error("edition not found");
  return row;
}

const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(40),
  minutes: z.union([z.literal(5), z.literal(15), z.literal(25)]),
  choices: z
    .array(
      z.object({ winner: z.enum(TOPIC_SLUGS), loser: z.enum(TOPIC_SLUGS) }),
    )
    .min(1)
    .max(12),
});

/** Turns headline duels into base interest weights and opens today's paper. */
export async function finishOnboarding(
  input: z.infer<typeof onboardingSchema>,
) {
  const userId = await requireUser();
  const { name, minutes, choices } = onboardingSchema.parse(input);

  const weights = new Map<string, number>();
  const bump = (topic: string, d: number) =>
    weights.set(topic, (weights.get(topic) ?? 0.3) + d);
  for (const { winner, loser } of choices) {
    bump(winner, 0.25);
    if (sectionFor(winner) !== winner) bump(sectionFor(winner), 0.1);
    bump(loser, -0.1);
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        displayName: name,
        readingMinutes: minutes,
        onboardedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
    await tx.delete(userTopicBase).where(eq(userTopicBase.userId, userId));
    if (weights.size) {
      await tx.insert(userTopicBase).values(
        [...weights].map(([topicSlug, w]) => ({
          userId,
          topicSlug,
          baseWeight: Math.min(1, Math.max(0.02, Math.round(w * 100) / 100)),
        })),
      );
    }
    await tx.insert(events).values(
      choices.map((c) => ({
        userId,
        type: "pair_choice" as const,
        topicSlug: c.winner,
        value: { loser: c.loser },
      })),
    );
  });
  redirect("/today");
}

/**
 * Called when a reader opens a story: remembers that they have read it as of
 * this edition (powering Since You Last Read) and that they met its concepts.
 */
export async function markStoryRead(editionId: string, clusterId: string) {
  const userId = await requireUser();
  const db = getDb();
  const { asOf } = await ownedEdition(userId, editionId);
  const [cluster] = await db
    .select({ topic: storyClusters.topicSlug })
    .from(storyClusters)
    .where(eq(storyClusters.id, clusterId));
  if (!cluster) return;

  await db.transaction(async (tx) => {
    await tx
      .insert(storyReads)
      .values({ userId, clusterId, lastReadAt: asOf })
      .onConflictDoUpdate({
        target: [storyReads.userId, storyReads.clusterId],
        set: {
          lastReadAt: sql`greatest(${storyReads.lastReadAt}, excluded.last_read_at)`,
          readCount: sql`${storyReads.readCount} + 1`,
        },
      });
    const conceptIds = await tx
      .select({ id: clusterConcepts.conceptId })
      .from(clusterConcepts)
      .where(eq(clusterConcepts.clusterId, clusterId));
    if (conceptIds.length) {
      await tx
        .insert(readerConcepts)
        .values(
          conceptIds.map((c) => ({
            userId,
            conceptId: c.id,
            exposures: 1,
            lastSeenAt: asOf,
          })),
        )
        .onConflictDoUpdate({
          target: [readerConcepts.userId, readerConcepts.conceptId],
          set: {
            exposures: sql`${readerConcepts.exposures} + 1`,
            lastSeenAt: sql`excluded.last_seen_at`,
          },
        });
    }
    await tx.insert(events).values({
      userId,
      type: "story_open",
      topicSlug: cluster.topic,
      clusterId,
      createdAt: asOf,
    });
  });
}

/** More / Less like this: shapes future editions, never today's. */
export async function storyFeedback(
  editionId: string,
  clusterId: string,
  kind: "more_like_this" | "less_like_this",
) {
  const userId = await requireUser();
  const db = getDb();
  const { asOf } = await ownedEdition(userId, editionId);
  const [cluster] = await db
    .select({ topic: storyClusters.topicSlug })
    .from(storyClusters)
    .where(eq(storyClusters.id, clusterId));
  await db.insert(events).values({
    userId,
    type: kind,
    topicSlug: cluster?.topic ?? null,
    clusterId,
    createdAt: asOf,
  });
  return { ok: true };
}

/** Records a Three Things answer; wrong answers resurface in a later edition. */
export async function answerRecall(
  editionId: string,
  factId: string,
  chosenIndex: number,
) {
  const userId = await requireUser();
  const { snapshot } = await ownedEdition(userId, editionId);
  const item = editionSnapshotSchema
    .parse(snapshot)
    .recall.find((r) => r.factId === factId);
  if (!item || chosenIndex < 0 || chosenIndex > 3)
    throw new Error("bad answer");
  const correct = chosenIndex === item.answerIndex;
  await getDb()
    .insert(recallAnswers)
    .values({ userId, editionId, factId, chosenIndex, correct })
    .onConflictDoNothing();
  const [fact] = await getDb()
    .select({ text: storyFacts.text })
    .from(storyFacts)
    .where(eq(storyFacts.id, factId));
  return { correct, answerIndex: item.answerIndex, fact: fact?.text ?? null };
}
