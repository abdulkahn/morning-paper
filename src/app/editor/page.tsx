import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db";
import {
  concepts,
  events,
  readerConcepts,
  storyClusters,
  storyReads,
  userTopicBase,
} from "@/db/schema";
import { deriveWeights } from "@/lib/ranking/weights";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TOPICS } from "@/lib/topics";
import { KnownToggle, TalkToEditor } from "./editor-client";

export const metadata = { title: "My Editor · The Morning Paper" };

export default function EditorPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <Link
        href="/today"
        className="text-ink-muted hover:text-ink text-sm underline underline-offset-4"
      >
        ← Today&rsquo;s paper
      </Link>
      <p className="text-ink-muted mt-6 text-xs font-medium tracking-[0.04em] uppercase">
        My Editor
      </p>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
        What your editor knows about you
      </h1>
      <p className="text-ink-muted mt-2">
        Everything here comes from your choices and reading. Change it by
        talking to your editor — it shapes tomorrow&rsquo;s paper, never
        today&rsquo;s.
      </p>
      <Suspense
        fallback={<p className="text-ink-muted mt-8">Opening your file…</p>}
      >
        <EditorFile />
      </Suspense>
    </main>
  );
}

const pct = (w: number) => `${Math.round(w * 100)}%`;

async function EditorFile() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const userId = user.id;
  const db = getDb();

  const [base, evts, known, reads] = await Promise.all([
    db.select().from(userTopicBase).where(eq(userTopicBase.userId, userId)),
    db
      .select({
        type: events.type,
        topicSlug: events.topicSlug,
        value: events.value,
      })
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(events.createdAt),
    db
      .select({
        id: concepts.id,
        name: concepts.name,
        type: concepts.type,
        explainer: concepts.explainer,
        exposures: readerConcepts.exposures,
        known: readerConcepts.known,
      })
      .from(readerConcepts)
      .innerJoin(concepts, eq(concepts.id, readerConcepts.conceptId))
      .where(eq(readerConcepts.userId, userId))
      .orderBy(desc(readerConcepts.lastSeenAt))
      .limit(60),
    db
      .select({
        headline: storyClusters.headline,
        title: storyClusters.title,
        lastReadAt: storyReads.lastReadAt,
        readCount: storyReads.readCount,
      })
      .from(storyReads)
      .innerJoin(storyClusters, eq(storyClusters.id, storyReads.clusterId))
      .where(eq(storyReads.userId, userId))
      .orderBy(desc(storyReads.lastReadAt))
      .limit(10),
  ]);

  const { weights, muted } = deriveWeights(base, evts);

  // Plain-language reasons per topic, counted from the event log.
  const reasons = new Map<string, string[]>();
  const count = (topic: string | null, label: string) => {
    if (!topic) return;
    const list = reasons.get(topic) ?? [];
    const existing = list.find((l) => l.endsWith(label));
    if (existing) {
      const n = Number(existing.split(" ")[0]) + 1;
      list[list.indexOf(existing)] = `${n} ${label}`;
    } else list.push(`1 ${label}`);
    reasons.set(topic, list);
  };
  for (const e of evts) {
    if (e.type === "pair_choice") {
      count(e.topicSlug, "× picked in onboarding");
      const loser = (e.value as { loser?: string } | null)?.loser ?? null;
      count(loser, "× passed over in onboarding");
    }
    if (e.type === "more_like_this") count(e.topicSlug, "× more like this");
    if (e.type === "less_like_this") count(e.topicSlug, "× less like this");
    if (e.type === "story_open") count(e.topicSlug, "× opened");
  }

  const topics = TOPICS.map((t) => ({
    ...t,
    weight: weights[t.slug] ?? 0.3,
    muted: muted.has(t.slug),
    reasons: reasons.get(t.slug) ?? [],
  })).sort((a, b) => Number(a.muted) - Number(b.muted) || b.weight - a.weight);

  const familiar = known.filter((c) => c.known || c.exposures >= 2);
  const learning = known.filter((c) => !c.known && c.exposures < 2);

  return (
    <div className="mt-10 space-y-14">
      <section aria-labelledby="interests">
        <h2
          id="interests"
          className="border-rule border-b-2 pb-2 text-sm font-semibold tracking-[0.04em] uppercase"
        >
          Your interests
        </h2>
        <ul
          className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2"
          data-testid="interest-list"
        >
          {topics.map((t) => (
            <li key={t.slug}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="text-ink-muted tabular-nums">
                  {t.muted ? "muted" : pct(t.weight)}
                </span>
              </div>
              <div className="bg-ink/10 mt-1 h-1.5 rounded-full">
                <div
                  className={`h-1.5 rounded-full ${t.muted ? "bg-ink/30" : "bg-accent"}`}
                  style={{ width: t.muted ? "100%" : pct(t.weight) }}
                />
              </div>
              {t.reasons.length ? (
                <p className="text-ink-muted mt-1 text-xs">
                  {t.reasons.join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <TalkToEditor />

      <section aria-labelledby="knowledge">
        <h2
          id="knowledge"
          className="border-rule border-b-2 pb-2 text-sm font-semibold tracking-[0.04em] uppercase"
        >
          What you know
        </h2>
        <p className="text-ink-muted mt-3 text-sm">
          Concepts you&rsquo;ve met in your papers. Once you know one, your
          editor stops explaining it.
        </p>
        {known.length === 0 ? (
          <p className="text-ink-muted mt-4 text-sm">
            Open a few stories and the concepts you meet will appear here.
          </p>
        ) : (
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">
                Still new to you{" "}
                <span className="text-ink-muted">({learning.length})</span>
              </h3>
              <ul className="mt-3 space-y-3 text-sm">
                {learning.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-4"
                  >
                    <span>
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-ink-muted">— {c.explainer}</span>
                    </span>
                    <KnownToggle conceptId={c.id} known={false} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Familiar — no longer explained{" "}
                <span className="text-ink-muted">({familiar.length})</span>
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {familiar.map((c) => (
                  <li
                    key={c.id}
                    className="border-rule rounded-full border px-3 py-1"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="reading">
        <h2
          id="reading"
          className="border-rule border-b-2 pb-2 text-sm font-semibold tracking-[0.04em] uppercase"
        >
          Stories you&rsquo;re following
        </h2>
        <p className="text-ink-muted mt-3 text-sm">
          When these move on, your paper shows only what&rsquo;s new since you
          last read them.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {reads.length === 0 ? (
            <li className="text-ink-muted">
              Nothing yet — open a story from today&rsquo;s paper.
            </li>
          ) : (
            reads.map((r) => (
              <li
                key={`${r.lastReadAt.toISOString()}-${r.title}`}
                className="flex justify-between gap-4"
              >
                <span>{r.headline ?? r.title}</span>
                <span className="text-ink-muted shrink-0">
                  last read{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "Asia/Karachi",
                  }).format(r.lastReadAt)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
