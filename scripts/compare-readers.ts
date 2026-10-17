// Diagnostic: two opposite readers through today's real onboarding duels,
// the same weight mapping and ranking as the app, compared before and after
// persistence. Creates two anonymous test readers and deletes them at the end.
//   npx tsx --env-file=.env.local scripts/compare-readers.ts
import { createClient } from "@supabase/supabase-js";
import { and, gt, isNotNull, lte, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import {
  events,
  profiles,
  storyClusters,
  userTopicBase,
} from "../src/db/schema";
import { getOrBuildEdition } from "../src/lib/edition/build";
import { allStories } from "../src/lib/edition/schema";
import {
  rankEdition,
  sectionFor,
  WEIGHTS,
  type Candidate,
} from "../src/lib/ranking/rank";
import { deriveWeights } from "../src/lib/ranking/weights";
import { onboardingWeights } from "../src/lib/ranking/onboarding";

type Pick = { headline: string; topic: string };

// --- Same duel selection as src/app/onboarding/page.tsx ---
async function loadDuels(): Promise<[Pick, Pick][]> {
  const rows = (await getDb().execute(sql`
    select headline, topic_slug from story_clusters
    where enriched_at is not null and topic_slug is not null and headline is not null
      and last_article_at > now() - interval '48 hours'
    order by source_count desc, importance desc nulls last
    limit 80`)) as unknown as { headline: string; topic_slug: string }[];
  const bySection = new Map<string, Pick[]>();
  for (const r of rows) {
    const s = sectionFor(r.topic_slug);
    const list = bySection.get(s) ?? [];
    if (list.length < 3)
      list.push({ headline: r.headline, topic: r.topic_slug });
    bySection.set(s, list);
  }
  const queues = [...bySection.values()];
  const picks: Pick[] = [];
  for (let round = 0; picks.length < 12 && round < 3; round++)
    for (const q of queues)
      if (q[round] && picks.length < 12) picks.push(q[round]);
  const duels: [Pick, Pick][] = [];
  for (let i = 0; i + 1 < picks.length && duels.length < 6; i += 2)
    duels.push([picks[i], picks[i + 1]]);
  return duels;
}

// Onboarding weights come from the same function the app uses.

const READERS = {
  A: {
    likes: ["ai", "robotics", "technology", "semiconductors", "science"],
    dislikes: ["sport", "football", "cricket"],
    loves: ["ai", "robotics", "technology"],
    nevers: ["sport"],
  },
  B: {
    likes: ["football", "sport", "cricket"],
    dislikes: ["ai", "robotics", "technology", "semiconductors"],
    loves: ["football", "sport"],
    nevers: ["ai", "technology"],
  },
};

function choose(duels: [Pick, Pick][], r: (typeof READERS)["A"]) {
  const score = (t: string) =>
    r.likes.includes(t) || r.likes.includes(sectionFor(t))
      ? 1
      : r.dislikes.includes(t) || r.dislikes.includes(sectionFor(t))
        ? -1
        : 0;
  const choices: { winner: string; loser: string; duel: string }[] = [];
  for (const [a, b] of duels) {
    if (score(a.topic) === score(b.topic)) continue; // a real reader would skip
    const [win, lose] = score(a.topic) > score(b.topic) ? [a, b] : [b, a];
    choices.push({
      winner: win.topic,
      loser: lose.topic,
      duel: `${a.topic} vs ${b.topic}`,
    });
  }
  return choices;
}

async function candidates(
  now: Date,
): Promise<(Candidate & { headline: string })[]> {
  const rows = await getDb()
    .select({
      id: storyClusters.id,
      topic: storyClusters.topicSlug,
      importance: storyClusters.importance,
      sourceCount: storyClusters.sourceCount,
      lastArticleAt: storyClusters.lastArticleAt,
      headline: storyClusters.headline,
    })
    .from(storyClusters)
    .where(
      and(
        isNotNull(storyClusters.enrichedAt),
        lte(storyClusters.firstSeenAt, now),
        gt(storyClusters.lastArticleAt, new Date(now.getTime() - 48 * 36e5)),
      ),
    );
  return rows.map((c) => ({
    clusterId: c.id,
    topic: c.topic,
    importance: c.importance ?? 2,
    sourceCount: c.sourceCount,
    lastArticleAt: c.lastArticleAt,
    readBefore: false,
    newFactCount: 0,
    headline: c.headline ?? "",
  }));
}

async function main() {
  const now = new Date();
  const duels = await loadDuels();
  console.log(
    "Today's duels:",
    duels.map(([a, b]) => `${a.topic} vs ${b.topic}`).join(" | "),
  );
  const pool = await candidates(now);
  console.log(`Candidate stories: ${pool.length}`);
  const headline = new Map(pool.map((c) => [c.clusterId, c.headline]));

  const ranked: Record<string, string[]> = {};
  const persist = process.argv.includes("--persist");
  const created: string[] = [];
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    },
  );
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );

  try {
    for (const [name, prefs] of Object.entries(READERS)) {
      const choices = choose(duels, prefs);
      const ob = onboardingWeights({
        choices,
        loves: prefs.loves,
        nevers: prefs.nevers,
      });
      const base = [...new Set([...ob.weights.keys(), ...ob.muted])].map(
        (topicSlug) => ({
          topicSlug,
          baseWeight: ob.weights.get(topicSlug) ?? 0.02,
          muted: ob.muted.has(topicSlug),
        }),
      );
      const { weights, muted } = deriveWeights(base, []);
      console.log(
        `  loves: ${prefs.loves.join(", ")} · never: ${prefs.nevers.join(", ")}`,
      );
      console.log(
        `\n=== Reader ${name} — likes ${prefs.likes.join("/")}, dislikes ${prefs.dislikes.join("/")}`,
      );
      console.log(
        `  duel choices: ${choices.map((c) => `${c.winner}>${c.loser}`).join(", ") || "(none matched — all skipped)"}`,
      );
      console.log(
        `  saved weights: ${
          Object.entries(weights)
            .sort((a, b) => b[1] - a[1])
            .map(([t, v]) => `${t}=${v}`)
            .join(" ") || "(none — every topic at default 0.3)"
        }`,
      );

      const out = rankEdition(pool, weights, muted, 15, now);
      ranked[name] = out.map((r) => r.clusterId);
      console.log("  TOP 5 (before persistence):");
      out.slice(0, 5).forEach((r, i) => {
        const s = r.score;
        console.log(
          `   ${i + 1}. [${r.topic}] ${headline.get(r.clusterId)?.slice(0, 64)}\n` +
            `      total ${s.total.toFixed(3)} = interest ${(WEIGHTS.interest * s.interest).toFixed(3)} + importance ${(WEIGHTS.importance * s.importance).toFixed(3)} + fresh ${(WEIGHTS.freshness * s.freshness).toFixed(3)} + coverage ${(WEIGHTS.coverage * s.coverage).toFixed(3)} + novelty ${(WEIGHTS.novelty * s.novelty).toFixed(3)}`,
        );
      });

      if (persist) {
        const { data, error } = await supa.auth.signInAnonymously();
        if (error || !data.user) throw error;
        const userId = data.user.id;
        created.push(userId);
        const db = getDb();
        await db.insert(profiles).values({
          userId,
          displayName: `Test ${name}`,
          readingMinutes: 15,
          onboardedAt: now,
        });
        if (base.length)
          await db
            .insert(userTopicBase)
            .values(base.map((b) => ({ ...b, userId })));
        if (choices.length)
          await db.insert(events).values(
            choices.map((c) => ({
              userId,
              type: "pair_choice" as const,
              topicSlug: c.winner as never,
              value: { loser: c.loser },
            })),
          );
        const { snapshot } = await getOrBuildEdition(userId, { asOf: now });
        const ids = allStories(snapshot).map((s) => s.clusterId);
        const sameAsRanked =
          ids.length === ranked[name].length &&
          ids.every((id) => ranked[name].includes(id)) &&
          ids[0] === ranked[name][0];
        console.log(
          `  PERSISTED edition: lead "${snapshot.lead.headline.slice(0, 60)}" · ${ids.length} stories · same stories + same lead as pre-persistence ranking: ${sameAsRanked}`,
        );
      }
    }

    const overlap = ranked.A.filter((id) => ranked.B.includes(id)).length;
    console.log(
      `\nOverlap between A and B: ${overlap}/${ranked.A.length} stories · same lead: ${ranked.A[0] === ranked.B[0]}`,
    );
  } finally {
    for (const id of created) await admin.auth.admin.deleteUser(id); // cascades to profiles/editions
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);
