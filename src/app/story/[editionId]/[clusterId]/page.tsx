import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  Explainers,
  KeyPoints,
  Kicker,
  SinceYouLastRead,
  WhyInPaper,
} from "@/components/paper/story-parts";
import { allStories } from "@/lib/edition/schema";
import { loadEdition } from "@/lib/edition/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReadTracker, StoryFeedback } from "./story-client";

export const metadata = { title: "Story · The Morning Paper" };

export default function StoryPage({
  params,
}: PageProps<"/story/[editionId]/[clusterId]">) {
  return (
    <Suspense
      fallback={
        <p className="text-ink-muted mx-auto max-w-3xl px-4 py-12">
          Opening story…
        </p>
      }
    >
      <Story params={params} />
    </Suspense>
  );
}

async function Story({
  params,
}: Pick<PageProps<"/story/[editionId]/[clusterId]">, "params">) {
  await connection();
  const { editionId, clusterId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const edition = await loadEdition(editionId);
  if (!edition || edition.userId !== user.id) notFound();
  const story = allStories(edition).find((s) => s.clusterId === clusterId);
  if (!story) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ReadTracker editionId={editionId} clusterId={clusterId} />
      <Link
        href="/today"
        className="text-ink-muted hover:text-ink text-sm underline underline-offset-4"
      >
        ← Back to your paper
      </Link>
      <article className="mt-6 space-y-5">
        <Kicker story={story} />
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">
          {story.headline}
        </h1>
        <p className="text-ink-muted text-lg leading-relaxed">{story.dek}</p>
        <WhyInPaper text={story.whyInPaper} />
        <SinceYouLastRead story={story} />

        <section aria-label="Your brief" className="space-y-3">
          {story.brief.map((p) => (
            <p key={p} className="leading-relaxed">
              {p}
            </p>
          ))}
        </section>

        {story.whyItMatters ? (
          <section aria-label="Why it matters">
            <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
              Why it matters
            </p>
            <p className="mt-1 leading-relaxed">{story.whyItMatters}</p>
          </section>
        ) : null}

        <KeyPoints story={story} />
        <Explainers story={story} />

        <section aria-label="Sources">
          <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
            Read the original reporting
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {story.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <StoryFeedback editionId={editionId} clusterId={clusterId} />
      </article>
    </main>
  );
}
