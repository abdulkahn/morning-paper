import { continuingStories, storyAnchorId } from "@/lib/edition/continuing";
import { formatEditionDate } from "@/lib/edition/format";
import type { EditionSnapshot } from "@/lib/edition/schema";
import { topicImage } from "@/lib/edition/images";
import { StoryVisual } from "./story-visual";

export function ContinuingStories({
  edition,
  storyHref,
}: {
  edition: EditionSnapshot;
  storyHref?: string;
}) {
  const stories = continuingStories(edition);
  if (!stories.length) return null;

  return (
    <section
      aria-labelledby="continuing-stories-title"
      className="border-rule mt-12 border-y py-8"
    >
      <p className="editorial-eyebrow text-accent">Following the story</p>
      <h2
        id="continuing-stories-title"
        className="font-display mt-3 text-3xl tracking-tight sm:text-4xl"
      >
        More on what you read earlier
      </h2>
      <p className="text-ink-muted mt-3 max-w-2xl text-sm leading-relaxed">
        New developments in stories you&rsquo;ve already read. Here&rsquo;s what
        changed in this edition.
      </p>
      <ul
        className={`mt-7 grid gap-8 ${stories.length > 1 ? "lg:grid-cols-2" : "max-w-4xl"}`}
      >
        {stories.map((story) => {
          const update = story.continuing!;
          const count = update.newFacts.length + update.changedFacts.length;
          const summary = update.changedFacts[0] ?? update.newFacts[0];
          const hasImage = story.image || topicImage(story.topic);
          return (
            <li
              key={story.clusterId}
              className={`bg-ink/[0.025] grid min-w-0 gap-5 p-5 ${hasImage ? "sm:grid-cols-[140px_minmax(0,1fr)]" : ""}`}
            >
              {hasImage && (
                <div>
                  <StoryVisual story={story} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-accent text-xs tracking-wide uppercase">
                  {story.topic} · {count} {count === 1 ? "update" : "updates"}
                </p>
                <p className="text-ink-muted mt-2 text-xs">
                  You last read this story on{" "}
                  <time dateTime={update.lastReadAt}>
                    {formatEditionDate(update.lastReadAt.slice(0, 10))}
                  </time>
                  .
                </p>
                <h3 className="font-display mt-3 text-xl leading-snug">
                  {story.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed">
                  <span className="font-semibold">
                    {update.changedFacts.length ? "Changed: " : "New: "}
                  </span>
                  {summary}
                </p>
                <a
                  href={
                    storyHref
                      ? `${storyHref}/${encodeURIComponent(story.clusterId)}`
                      : `#${encodeURIComponent(storyAnchorId(story.id))}`
                  }
                  aria-label={`Read update: ${story.headline}`}
                  className="mt-4 inline-flex min-h-11 items-center gap-5 text-sm underline underline-offset-4"
                >
                  Read update <span aria-hidden>↓</span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
