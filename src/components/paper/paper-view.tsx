import Link from "next/link";
import type { ReactNode } from "react";
import { formatEditionDate } from "@/lib/edition/format";
import type {
  EditionSnapshot,
  SectionSnapshot,
  StorySnapshot,
} from "@/lib/edition/schema";
import { editionStats } from "@/lib/edition/schema";
import { EditorNote, Masthead } from "./masthead";
import {
  Explainers,
  KeyPoints,
  Kicker,
  SinceYouLastRead,
  SourceLine,
  WhyInPaper,
} from "./story-parts";

// Web rendering of a frozen edition snapshot.

export function PaperView({
  edition,
  context,
  storyHref,
  extra,
}: {
  edition: EditionSnapshot;
  /** When set, headlines link to `${storyHref}/${clusterId}`. */
  storyHref?: string;
  /** Rendered after the stories, before the footer (e.g. Three Things). */
  extra?: ReactNode;
  context?: {
    archived: boolean;
    archiveHref: string;
    todayHref: string;
    pdfAvailable: boolean;
  };
}) {
  const stats = editionStats(edition);
  const archiveHref = context?.archiveHref ?? "/archive";
  const todayHref = context?.todayHref ?? "/today";
  const pdfAvailable = context?.pdfAvailable ?? edition.id === "demo";
  return (
    <main className="edition-shell mx-auto w-full flex-1 px-5 py-8 sm:px-10">
      <nav
        aria-label="Edition navigation"
        className="text-ink-muted mb-4 flex flex-wrap gap-x-6 gap-y-3 text-sm"
      >
        <Link
          href={archiveHref}
          className="hover:text-ink underline underline-offset-4"
        >
          Back to Archive
        </Link>
        <Link
          href={todayHref}
          className="hover:text-ink underline underline-offset-4"
        >
          Today&rsquo;s Paper
        </Link>
      </nav>
      {context?.archived && (
        <aside
          aria-label="Historical edition"
          className="border-rule bg-ink/5 mb-8 border-l-2 px-5 py-4"
        >
          <p className="text-accent text-xs font-semibold tracking-[0.12em] uppercase">
            Archived edition
          </p>
          <p className="mt-2 text-sm">
            This is the edition you received on{" "}
            {formatEditionDate(edition.date)}. Kept just as it was published.
          </p>
        </aside>
      )}
      <Masthead
        edition={edition}
        actions={
          pdfAvailable ? (
            <a
              href={`/api/pdf/${encodeURIComponent(edition.id)}`}
              className="editorial-button"
            >
              Download PDF
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="text-ink-muted min-h-11 border border-current/30 px-4 py-2 text-sm"
            >
              PDF unavailable
            </button>
          )
        }
      />

      <div className="border-rule mt-6 max-w-3xl border-l pl-5">
        <EditorNote note={edition.editorNote} />
      </div>

      <LeadStory story={edition.lead} href={storyHref} />

      {edition.sections.map((section) => (
        <Section key={section.slug} section={section} href={storyHref} />
      ))}

      {extra}

      <footer className="border-rule mt-16 border-t pt-10 pb-12 text-center">
        <p className="font-display text-3xl font-bold">
          You&rsquo;re caught up.
        </p>
        <p className="text-ink-muted mt-2 text-sm">
          {stats.stories} stories from {stats.sources} sources.{" "}
          {context?.archived
            ? "An edition worth keeping."
            : "See you tomorrow morning."}
        </p>
      </footer>
    </main>
  );
}

function LeadStory({ story, href }: { story: StorySnapshot; href?: string }) {
  return (
    <article
      aria-label="Lead story"
      className="border-rule mt-10 grid gap-10 border-t pt-9 lg:grid-cols-3 lg:gap-14"
    >
      <div className="space-y-4 lg:col-span-2">
        <Kicker story={story} />
        <h2 className="font-display text-4xl leading-[1.1] font-normal tracking-[-0.045em] sm:text-5xl lg:text-6xl">
          <Headline story={story} href={href} />
        </h2>
        <p className="text-ink-muted text-lg leading-relaxed">{story.dek}</p>
        <WhyInPaper text={story.whyInPaper} />
        <SinceYouLastRead story={story} />
        {story.brief.map((p) => (
          <p key={p} className="leading-relaxed">
            {p}
          </p>
        ))}
        <SourceLine story={story} />
      </div>
      <div className="bg-ink/[0.025] border-rule space-y-8 self-start border-t p-6 lg:mt-2">
        <KeyPoints story={story} />
        <Explainers story={story} />
      </div>
    </article>
  );
}

function Section({
  section,
  href,
}: {
  section: SectionSnapshot;
  href?: string;
}) {
  return (
    <section aria-labelledby={`section-${section.slug}`} className="mt-16">
      <h2
        id={`section-${section.slug}`}
        className="border-rule border-b-2 pb-2 text-sm font-semibold tracking-[0.04em] uppercase"
      >
        {section.title}
      </h2>

      {/* Never regroup by tier: the stored order is the editor's frozen order. */}
      <div className="mt-6 grid gap-8 md:grid-cols-6">
        {section.stories.map((story) => (
          <div
            key={story.id}
            data-story-id={story.id}
            className={
              story.tier === "standard"
                ? "min-w-0 md:col-span-2"
                : "min-w-0 md:col-span-3"
            }
          >
            {story.tier === "major" ? (
              <MajorStory story={story} href={href} />
            ) : story.tier === "brief" ? (
              <article className="space-y-2 text-sm">
                <p className="text-ink-muted text-xs tracking-wide uppercase">
                  In brief
                </p>
                <h3 className="font-display text-lg font-bold">
                  <Headline story={story} href={href} />
                </h3>
                <p className="text-ink-muted">{story.dek}</p>
                <SourceLine story={story} />
              </article>
            ) : (
              <StandardStory story={story} href={href} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function MajorStory({ story, href }: { story: StorySnapshot; href?: string }) {
  return (
    <article className="space-y-3">
      <Kicker story={story} />
      <h3 className="font-display text-2xl leading-tight font-bold tracking-tight">
        <Headline story={story} href={href} />
      </h3>
      <p className="text-ink-muted leading-relaxed">{story.dek}</p>
      <WhyInPaper text={story.whyInPaper} />
      <SinceYouLastRead story={story} />
      {story.brief.map((p) => (
        <p key={p} className="text-sm leading-relaxed">
          {p}
        </p>
      ))}
      <Explainers story={story} />
      <SourceLine story={story} />
    </article>
  );
}

function StandardStory({
  story,
  href,
}: {
  story: StorySnapshot;
  href?: string;
}) {
  return (
    <article className="space-y-2">
      <Kicker story={story} />
      <h3 className="font-display text-lg leading-snug font-bold">
        <Headline story={story} href={href} />
      </h3>
      <p className="text-ink-muted text-sm leading-relaxed">{story.dek}</p>
      <WhyInPaper text={story.whyInPaper} />
      <SourceLine story={story} />
    </article>
  );
}

function Headline({ story, href }: { story: StorySnapshot; href?: string }) {
  if (!href) return <>{story.headline}</>;
  return (
    <Link
      href={`${href}/${story.clusterId}`}
      className="hover:text-accent decoration-1 underline-offset-4 hover:underline"
    >
      {story.headline}
    </Link>
  );
}
