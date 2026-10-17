import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db";
import { sectionFor, sectionName } from "@/lib/ranking/rank";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Duels, type Duel } from "./duels";

export const metadata = { title: "Meet your editor · The Morning Paper" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
        Meet your editor
      </p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">
        Which would you rather read?
      </h1>
      <p className="text-ink-muted mt-2">
        Six quick choices between today&rsquo;s real headlines. Your editor
        builds your first paper from them.
      </p>
      <Suspense
        fallback={
          <p className="text-ink-muted mt-8">
            Gathering today&rsquo;s headlines…
          </p>
        }
      >
        <OnboardingFlow />
      </Suspense>
    </main>
  );
}

async function OnboardingFlow() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("user_id", user.id)
    .single();
  if (profile?.onboarded_at) redirect("/today");

  return <Duels duels={await loadDuels()} />;
}

/** Pairs real, enriched headlines from different sections. */
async function loadDuels(): Promise<Duel[]> {
  const rows = (await getDb().execute(sql`
    select headline, topic_slug from story_clusters
    where enriched_at is not null and topic_slug is not null and headline is not null
      and last_article_at > now() - interval '48 hours'
    order by source_count desc, importance desc nulls last
    limit 80`)) as unknown as { headline: string; topic_slug: string }[];

  // Best headline per section, then pair across sections.
  const bySection = new Map<string, { headline: string; topic: string }[]>();
  for (const r of rows) {
    const s = sectionFor(r.topic_slug);
    const list = bySection.get(s) ?? [];
    if (list.length < 3)
      list.push({ headline: r.headline, topic: r.topic_slug });
    bySection.set(s, list);
  }
  const queues = [...bySection.values()];
  const picks: { headline: string; topic: string }[] = [];
  for (let round = 0; picks.length < 12 && round < 3; round++) {
    for (const q of queues)
      if (q[round] && picks.length < 12) picks.push(q[round]);
  }
  const duels: Duel[] = [];
  for (let i = 0; i + 1 < picks.length && duels.length < 6; i += 2) {
    const [a, b] = [picks[i], picks[i + 1]];
    duels.push({
      a: { ...a, section: sectionName(sectionFor(a.topic)) },
      b: { ...b, section: sectionName(sectionFor(b.topic)) },
    });
  }
  return duels;
}
