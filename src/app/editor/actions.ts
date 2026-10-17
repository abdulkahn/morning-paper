"use server";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { events, readerConcepts, userTopicBase } from "@/db/schema";
import {
  parseInstruction,
  planChanges,
  type WeightDiff,
} from "@/lib/editor/talk";
import { getEnv } from "@/lib/env";
import { deriveWeights } from "@/lib/ranking/weights";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TOPIC_SLUGS } from "@/lib/topics";

async function requireUser(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user.id;
}

async function currentModel(userId: string) {
  const db = getDb();
  const base = await db
    .select()
    .from(userTopicBase)
    .where(eq(userTopicBase.userId, userId));
  const evts = await db
    .select({ type: events.type, topicSlug: events.topicSlug })
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(events.createdAt);
  return { base, ...deriveWeights(base, evts) };
}

/** Interprets the reader's request and shows the change before applying it. */
export async function previewInstruction(text: string): Promise<{
  reply: string;
  diff: WeightDiff[];
  source: "llm" | "keywords";
}> {
  const userId = await requireUser();
  const input = z.string().trim().min(2).max(500).parse(text);
  const env = getEnv();
  const client =
    env.LLM_MODE === "live" && env.ANTHROPIC_API_KEY
      ? new Anthropic({
          apiKey: env.ANTHROPIC_API_KEY,
          maxRetries: 1,
          timeout: 20_000,
        })
      : null;
  const { weights, muted } = await currentModel(userId);
  const parsed = await parseInstruction(input, {
    client,
    model: env.LLM_BULK_MODEL,
  });
  return {
    reply: parsed.reply,
    diff: planChanges(parsed, weights, muted),
    source: parsed.source,
  };
}

const applySchema = z
  .array(
    z.object({
      topic: z.enum(TOPIC_SLUGS),
      after: z.number().min(0.02).max(1),
      mutedAfter: z.boolean(),
    }),
  )
  .min(1)
  .max(6);

/**
 * Applies a previewed change. The server recomputes the current weights and
 * shifts the stored base weight by the difference, so future editions land on
 * the target. Today's paper is frozen and unaffected.
 */
export async function applyInstruction(
  diff: { topic: string; after: number; mutedAfter: boolean }[],
) {
  const userId = await requireUser();
  const changes = applySchema.parse(diff);
  const { base, weights } = await currentModel(userId);
  const baseOf = new Map(base.map((b) => [b.topicSlug, b.baseWeight]));

  await getDb().transaction(async (tx) => {
    for (const c of changes) {
      const current = weights[c.topic] ?? 0.3;
      const oldBase = baseOf.get(c.topic) ?? 0.3;
      const newBase =
        Math.round(
          Math.min(1, Math.max(0.02, oldBase + (c.after - current))) * 100,
        ) / 100;
      await tx
        .insert(userTopicBase)
        .values({
          userId,
          topicSlug: c.topic,
          baseWeight: newBase,
          muted: c.mutedAfter,
        })
        .onConflictDoUpdate({
          target: [userTopicBase.userId, userTopicBase.topicSlug],
          set: {
            baseWeight: newBase,
            muted: c.mutedAfter,
            updatedAt: new Date(),
          },
        });
    }
  });
  return { ok: true };
}

/** "I know this": the concept stops being explained in future papers. */
export async function setConceptKnown(conceptId: string, known: boolean) {
  const userId = await requireUser();
  const id = z.uuid().parse(conceptId);
  await getDb()
    .insert(readerConcepts)
    .values({
      userId,
      conceptId: id,
      exposures: 1,
      known,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [readerConcepts.userId, readerConcepts.conceptId],
      set: { known },
    });
  return { ok: true };
}
