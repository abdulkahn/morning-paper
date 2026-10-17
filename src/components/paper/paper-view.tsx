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

export function PaperView({ edition }: { edition: EditionSnapshot }) {
  const stats = editionStats(edition);
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Masthead
        edition={edition}
        actions={
          <a
            href={`/api/pdf/${edition.id}`}
            className="border-rule hover:bg-ink hover:text-paper rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            Download PDF
          </a>
        }
      />

      <div className="mt-8 max-w-3xl">
        <EditorNote note={edition.editorNote} />
      </div>

      <LeadStory story={edition.lead} />

      {edition.sections.map((section) => (
        <Section key={section.slug} section={section} />
      ))}

      <footer className="border-rule mt-16 border-t-4 border-double pt-8 pb-16 text-center">
        <p className="font-display text-3xl font-bold">
          You&rsquo;re caught up.
        </p>
        <p className="text-ink-muted mt-2 text-sm">
          {stats.stories} stories from {stats.sources} sources. See you tomorrow
          morning.
        </p>
      </footer>
    </main>
  );
}

function LeadStory({ story }: { story: StorySnapshot }) {
  return (
    <article
      aria-label="Lead story"
      className="border-rule mt-8 grid gap-8 border-t pt-8 lg:grid-cols-3"
    >
      <div className="space-y-4 lg:col-span-2">
        <Kicker story={story} />
        <h2 className="font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          {story.headline}
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
      <div className="border-rule space-y-8 lg:border-l lg:pl-8">
        <KeyPoints story={story} />
        <Explainers story={story} />
      </div>
    </article>
  );
}

function Section({ section }: { section: SectionSnapshot }) {
  const major = section.stories.filter((s) => s.tier === "major");
  const standard = section.stories.filter((s) => s.tier === "standard");
  const briefs = section.stories.filter((s) => s.tier === "brief");

  return (
    <section aria-labelledby={`section-${section.slug}`} className="mt-16">
      <h2
        id={`section-${section.slug}`}
        className="border-rule border-b-2 pb-2 text-sm font-semibold tracking-[0.04em] uppercase"
      >
        {section.title}
      </h2>

      {major.length > 0 ? (
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {major.map((s) => (
            <MajorStory key={s.id} story={s} />
          ))}
        </div>
      ) : null}

      {standard.length > 0 ? (
        <div className="border-rule mt-8 grid gap-8 border-t pt-6 md:grid-cols-3">
          {standard.map((s) => (
            <StandardStory key={s.id} story={s} />
          ))}
        </div>
      ) : null}

      {briefs.length > 0 ? (
        <div className="border-rule mt-8 border-t pt-4">
          <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
            In brief
          </p>
          <ul className="mt-2 grid gap-x-8 gap-y-2 md:grid-cols-2">
            {briefs.map((s) => (
              <li key={s.id} className="text-sm">
                <span className="font-semibold">{s.headline}.</span>{" "}
                <span className="text-ink-muted">{s.dek}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function MajorStory({ story }: { story: StorySnapshot }) {
  return (
    <article className="space-y-3">
      <Kicker story={story} />
      <h3 className="font-display text-2xl leading-tight font-bold tracking-tight">
        {story.headline}
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

function StandardStory({ story }: { story: StorySnapshot }) {
  return (
    <article className="space-y-2">
      <Kicker story={story} />
      <h3 className="font-display text-lg leading-snug font-bold">
        {story.headline}
      </h3>
      <p className="text-ink-muted text-sm leading-relaxed">{story.dek}</p>
      <WhyInPaper text={story.whyInPaper} />
      <SourceLine story={story} />
    </article>
  );
}
