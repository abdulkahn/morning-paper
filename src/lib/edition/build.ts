import { and, desc, eq, gt, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  articles,
  clusterConcepts,
  concepts,
  editions,
  events,
  profiles,
  readerConcepts,
  recallAnswers,
  sources,
  storyClusters,
  storyFacts,
  storyReads,
  userTopicBase,
} from "@/db/schema";
import { editorNote } from "./editor-note";
import { selectStoryImage } from "./images";
import { newFactsSince } from "./since";
import {
  editionSnapshotSchema,
  recallItemSchema,
  storySnapshotSchema,
  type EditionSnapshot,
  type RecallItem,
  type SectionSnapshot,
  type StorySnapshot,
} from "./schema";
import {
  rankEdition,
  sectionName,
  whyInPaper,
  type Candidate,
} from "@/lib/ranking/rank";
import { deriveWeights } from "@/lib/ranking/weights";

// Builds (or returns) a reader's frozen paper for a date. Server-only: uses the
// owner DB connection, so callers must pass a verified user id.

const WINDOW_HOURS = 48;
const READ_MINUTES = {
  lead: 2.5,
  major: 1.5,
  standard: 1,
  brief: 0.3,
} as const;

/** Local calendar date (YYYY-MM-DD) of a moment in a reader's time zone. */
export function editionDateFor(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
}

export async function getOrBuildEdition(
  userId: string,
  { asOf = new Date() }: { asOf?: Date } = {},
): Promise<{ id: string; snapshot: EditionSnapshot }> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  if (!profile) throw new Error("profile not found");
  const date = editionDateFor(asOf, profile.timezone);

  const [existing] = await db
    .select({ id: editions.id, snapshot: editions.snapshot })
    .from(editions)
    .where(and(eq(editions.userId, userId), eq(editions.editionDate, date)));
  if (existing) {
    return {
      id: existing.id,
      snapshot: editionSnapshotSchema.parse(existing.snapshot),
    };
  }

  // ---- Reader model as of `asOf` ----
  const base = await db
    .select()
    .from(userTopicBase)
    .where(eq(userTopicBase.userId, userId));
  const evts = await db
    .select({ type: events.type, topicSlug: events.topicSlug })
    .from(events)
    .where(and(eq(events.userId, userId), lte(events.createdAt, asOf)))
    .orderBy(events.createdAt);
  const { weights, muted } = deriveWeights(base, evts);

  const [previous] = await db
    .select({ weights: editions.weights, number: editions.number })
    .from(editions)
    .where(and(eq(editions.userId, userId), lt(editions.editionDate, date)))
    .orderBy(desc(editions.editionDate))
    .limit(1);

  // ---- Candidate stories ----
  // Explicit columns: never pull the 1024-d centroid vectors over the wire.
  const clusters = await db
    .select({
      id: storyClusters.id,
      title: storyClusters.title,
      topicSlug: storyClusters.topicSlug,
      sourceCount: storyClusters.sourceCount,
      headline: storyClusters.headline,
      dek: storyClusters.dek,
      brief: storyClusters.brief,
      whyItMatters: storyClusters.whyItMatters,
      keyPoints: storyClusters.keyPoints,
      importance: storyClusters.importance,
      lastArticleAt: storyClusters.lastArticleAt,
    })
    .from(storyClusters)
    .where(
      and(
        isNotNull(storyClusters.enrichedAt),
        lte(storyClusters.firstSeenAt, asOf),
        gt(
          storyClusters.lastArticleAt,
          new Date(asOf.getTime() - WINDOW_HOURS * 36e5),
        ),
      ),
    );
  if (!clusters.length) throw new Error("no enriched stories available yet");
  const ids = clusters.map((c) => c.id);

  const reads = await db
    .select()
    .from(storyReads)
    .where(
      and(eq(storyReads.userId, userId), inArray(storyReads.clusterId, ids)),
    );
  const lastRead = new Map(reads.map((r) => [r.clusterId, r.lastReadAt]));

  const facts = await db
    .select()
    .from(storyFacts)
    .where(
      and(
        inArray(storyFacts.clusterId, ids),
        lte(storyFacts.firstSeenAt, asOf),
      ),
    )
    .orderBy(storyFacts.firstSeenAt);
  const factsBy = Map.groupBy(facts, (f) => f.clusterId);

  const candidates: Candidate[] = clusters.map((c) => {
    const readAt = lastRead.get(c.id);
    const newFacts = newFactsSince(factsBy.get(c.id) ?? [], readAt, asOf);
    return {
      clusterId: c.id,
      topic: c.topicSlug,
      importance: c.importance ?? 2,
      sourceCount: c.sourceCount,
      lastArticleAt: c.lastArticleAt < asOf ? c.lastArticleAt : asOf,
      readBefore: !!readAt,
      newFactCount: newFacts.length,
    };
  });

  const ranked = rankEdition(
    candidates,
    weights,
    muted,
    profile.readingMinutes,
    asOf,
  );
  const pickedIds = ranked.map((r) => r.clusterId);

  // ---- Per-story rendering inputs ----
  const srcRows = await db
    .select({
      clusterId: articles.clusterId,
      name: sources.name,
      url: articles.url,
      imageUrl: articles.imageUrl,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.slug, articles.sourceSlug))
    .where(
      and(
        inArray(articles.clusterId, pickedIds),
        lte(articles.publishedAt, asOf),
      ),
    )
    .orderBy(articles.publishedAt);
  const conceptRows = await db
    .select({
      clusterId: clusterConcepts.clusterId,
      conceptId: concepts.id,
      name: concepts.name,
      explainer: concepts.explainer,
    })
    .from(clusterConcepts)
    .innerJoin(concepts, eq(concepts.id, clusterConcepts.conceptId))
    .where(inArray(clusterConcepts.clusterId, pickedIds));
  const familiarity = await db
    .select()
    .from(readerConcepts)
    .where(eq(readerConcepts.userId, userId));
  const familiar = new Set(
    familiarity
      .filter((f) => f.known || f.exposures >= 2)
      .map((f) => f.conceptId),
  );

  const byId = new Map(clusters.map((c) => [c.id, c]));
  let continuingCount = 0;

  const stories: StorySnapshot[] = ranked.map((r) => {
    const c = byId.get(r.clusterId)!;
    const readAt = lastRead.get(c.id);
    const clusterFacts = factsBy.get(c.id) ?? [];
    const newFacts = newFactsSince(clusterFacts, readAt, asOf);
    if (readAt && newFacts.length) continuingCount++;

    const seenSources = new Map<string, string>();
    for (const s of srcRows) {
      if (s.clusterId === c.id && !seenSources.has(s.name))
        seenSources.set(s.name, s.url);
    }
    const sourceRefs = [...seenSources.entries()]
      .slice(0, 6)
      .map(([name, url]) => ({ name, url }));

    return {
      id: c.id,
      clusterId: c.id,
      tier: r.tier,
      topic: c.topicSlug ? sectionName(c.topicSlug) : "News",
      headline: c.headline ?? c.title,
      image: selectStoryImage(
        c.topicSlug ? sectionName(c.topicSlug) : "News",
        srcRows.filter((source) => source.clusterId === c.id),
      ),
      dek: c.dek ?? c.title,
      whyItMatters: c.whyItMatters,
      brief: (c.brief ?? []).slice(0, 2),
      keyPoints: (c.keyPoints ?? []).slice(0, 4),
      whyInPaper: whyInPaper(r, weights),
      continuing:
        readAt && newFacts.length
          ? {
              lastReadAt: readAt.toISOString(),
              newFacts: newFacts.slice(0, 5).map((f) => f.text),
              changedFacts: [],
            }
          : null,
      explainers: conceptRows
        .filter((x) => x.clusterId === c.id && !familiar.has(x.conceptId))
        .slice(0, 2)
        .map((x) => ({ term: x.name, text: x.explainer })),
      sources: sourceRefs.length
        ? sourceRefs
        : [{ name: "Source", url: "https://example.com" }],
      publishedAt: (c.lastArticleAt < asOf
        ? c.lastArticleAt
        : asOf
      ).toISOString(),
      readMinutes: READ_MINUTES[r.tier],
    };
  });

  // ---- Safety net: one malformed story must never take down the paper ----
  const valid = stories
    .map((story, i) => ({ story, section: ranked[i].section }))
    .filter(({ story }) => {
      const check = storySnapshotSchema.safeParse(story);
      if (!check.success) {
        console.error("[edition] dropping invalid story", {
          clusterId: story.clusterId,
          issues: check.error.issues.map((x) => x.path.join(".")).slice(0, 5),
        });
      }
      return check.success;
    });
  if (!valid.length) throw new Error("no valid stories for this edition");
  // If the lead was dropped, the next story becomes the lead.
  valid.forEach((v, i) => {
    if (i === 0) v.story.tier = "lead";
    else if (v.story.tier === "lead") v.story.tier = "major";
  });

  // ---- Layout: lead + sections in order of first appearance ----
  const [{ story: lead }, ...rest] = valid;
  const sections: SectionSnapshot[] = [];
  rest.forEach(({ story: s, section: slug }) => {
    let section = sections.find((x) => x.slug === slug);
    if (!section) {
      section = { slug, title: sectionName(slug), stories: [] };
      sections.push(section);
    }
    section.stories.push(s);
  });

  // ---- Three Things: resurface one missed fact, then today's key facts ----
  const answers = await db
    .select({ factId: recallAnswers.factId, correct: recallAnswers.correct })
    .from(recallAnswers)
    .where(eq(recallAnswers.userId, userId))
    .orderBy(recallAnswers.createdAt);
  const lastResult = new Map(answers.map((a) => [a.factId, a.correct]));
  const missed = [...lastResult.entries()]
    .filter(([, ok]) => !ok)
    .map(([id]) => id);
  const recall: RecallItem[] = [];
  if (missed.length) {
    const [fact] = await db
      .select({
        id: storyFacts.id,
        recall: storyFacts.recall,
        headline: storyClusters.headline,
      })
      .from(storyFacts)
      .innerJoin(storyClusters, eq(storyClusters.id, storyFacts.clusterId))
      .where(inArray(storyFacts.id, missed))
      .limit(1);
    if (fact?.recall) {
      recall.push({
        factId: fact.id,
        storyHeadline: fact.headline ?? "Earlier story",
        ...fact.recall,
        resurfaced: true,
      });
    }
  }
  for (const { story: s } of valid) {
    if (recall.length >= 3) break;
    const f = (factsBy.get(s.clusterId) ?? []).find(
      (x) =>
        x.recall &&
        !lastResult.has(x.id) &&
        !recall.some((r) => r.factId === x.id),
    );
    if (f?.recall) {
      recall.push({
        factId: f.id,
        storyHeadline: s.headline,
        ...f.recall,
        resurfaced: false,
      });
    }
  }

  const safeRecall = recall.filter(
    (r) => recallItemSchema.safeParse(r).success,
  );

  const number = (previous?.number ?? 0) + 1;
  const snapshot = editionSnapshotSchema.parse({
    id: "pending",
    number,
    date,
    readerName: profile.displayName ?? "Reader",
    isSample: false,
    editorNote: editorNote({
      readerName: profile.displayName ?? "Reader",
      editionNumber: number,
      weights,
      previousWeights: previous?.weights ?? null,
      continuingCount,
      leadSection: valid[0].section,
    }).slice(0, 600),
    lead,
    sections,
    recall: safeRecall,
  } satisfies EditionSnapshot);

  const [row] = await db
    .insert(editions)
    .values({ userId, editionDate: date, number, asOf, snapshot, weights })
    .onConflictDoNothing()
    .returning({ id: editions.id });
  if (!row) return getOrBuildEdition(userId, { asOf }); // concurrent build won
  const final = { ...snapshot, id: row.id };
  await db
    .update(editions)
    .set({ snapshot: final })
    .where(eq(editions.id, row.id));
  return { id: row.id, snapshot: final };
}
