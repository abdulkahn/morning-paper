import Link from "next/link";
import { StartButton } from "./start/start-button";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { StoryVisual } from "@/components/paper/story-visual";
import { storyAnchorId } from "@/lib/edition/continuing";
import type { StorySnapshot } from "@/lib/edition/schema";

const sampleHref = (story: StorySnapshot) =>
  `/paper/demo#${encodeURIComponent(storyAnchorId(story.id))}`;

export default function Home() {
  const [firstSection, ...remainingSections] = SAMPLE_EDITION.sections;
  return (
    <main className="home-shell">
      <section className="news-welcome" aria-labelledby="home-title">
        <div>
          <p className="editorial-eyebrow text-accent">
            Your personal daily edition
          </p>
          <h1 id="home-title">
            <span className="headline-reveal inline-block">
              Your world. In perspective.
            </span>
          </h1>
          <p className="text-ink-muted mt-2 text-sm">
            A paper that remembers what you already know.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StartButton />
          <Link
            href="/paper/demo"
            className="text-sm underline underline-offset-4"
          >
            See a sample edition
          </Link>
        </div>
      </section>
      <nav aria-label="Sample sections" className="edition-sections">
        <a href="#sample-top">Top stories</a>
        {SAMPLE_EDITION.sections.map((section) => (
          <a key={section.slug} href={`#sample-${section.slug}`}>
            {section.title}
          </a>
        ))}
      </nav>
      <section
        id="sample-top"
        aria-labelledby="sample-top-title"
        className="news-home-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sample-top-title" className="news-section-heading">
            Top stories
          </h2>
          <p className="sample-label">Sample edition · Illustrative content</p>
        </div>
        <div className="news-home-grid">
          <article className="news-home-lead">
            <StoryVisual story={SAMPLE_EDITION.lead} />
            <div className="news-home-lead-copy">
              <p className="editorial-eyebrow text-accent">
                {SAMPLE_EDITION.lead.topic} / The lead
              </p>
              <h3 className="headline-reveal mt-3">
                <a href={sampleHref(SAMPLE_EDITION.lead)}>
                  {SAMPLE_EDITION.lead.headline}
                </a>
              </h3>
              <p className="mt-4 text-sm leading-relaxed">
                {SAMPLE_EDITION.lead.dek}
              </p>
              <a
                href={sampleHref(SAMPLE_EDITION.lead)}
                className="mt-5 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
              >
                Read the full brief →
              </a>
            </div>
          </article>
          <div className="news-home-side">
            {firstSection.stories.slice(0, 2).map((story) => (
              <SampleCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>
      {[firstSection, ...remainingSections].map((section, index) => (
        <section
          id={`sample-${section.slug}`}
          aria-labelledby={`sample-heading-${section.slug}`}
          key={section.slug}
          className="news-home-section"
        >
          <h2
            id={`sample-heading-${section.slug}`}
            className="news-section-heading"
          >
            {section.title}
          </h2>
          <div className="news-card-grid">
            {(index === 0 ? section.stories.slice(2) : section.stories).map(
              (story) => (
                <SampleCard key={story.id} story={story} />
              ),
            )}
          </div>
        </section>
      ))}
      <section
        className="news-membership"
        aria-label="Your own morning edition"
      >
        <div>
          <p className="editorial-eyebrow">
            A little perspective. Every morning.
          </p>
          <h2>Your interests. Your edition.</h2>
          <p>
            Read what matters, follow what changed, and revisit your saved
            papers.
          </p>
        </div>
        <StartButton />
      </section>
      <footer className="border-rule text-ink-muted flex flex-wrap justify-between gap-4 border-t py-7 text-xs">
        <span>The Morning Paper</span>
        <span>A finite edition. A clearer picture.</span>
      </footer>
    </main>
  );
}

function SampleCard({ story }: { story: StorySnapshot }) {
  return (
    <article className="news-card">
      <StoryVisual story={story} />
      <p className="editorial-eyebrow text-accent mt-3">{story.topic}</p>
      <h3 className="mt-2">
        <a href={sampleHref(story)}>{story.headline}</a>
      </h3>
      <p className="text-ink-muted mt-3 text-sm leading-relaxed">{story.dek}</p>
      <p className="text-ink-muted mt-4 text-xs">
        {story.readMinutes} min read · Sample edition
      </p>
    </article>
  );
}
