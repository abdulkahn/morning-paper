import type { TimelineEntry } from "@/lib/edition/timeline";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));

/** "How this story developed": what the reader knew, and what's new since. */
export function StoryTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return null;
  const fresh = entries.filter((e) => e.kind === "fact" && e.isNew).length;
  return (
    <section aria-label="How this story developed" data-testid="story-timeline">
      <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
        How this story developed
      </p>
      {fresh ? (
        <p className="text-accent mt-1 text-sm">
          {fresh} new {fresh === 1 ? "development" : "developments"} since you
          last read it.
        </p>
      ) : null}
      <ol className="border-rule mt-3 space-y-3 border-l-2 pl-5">
        {entries.map((e, i) =>
          e.kind === "read" ? (
            <li
              key={`read-${i}`}
              className="relative text-sm font-semibold"
              data-testid="timeline-read-marker"
            >
              <span className="bg-ink absolute top-1 -left-[27px] h-3 w-3 rounded-full" />
              You read this story · {when(e.at)} UTC
            </li>
          ) : (
            <li
              key={`${e.at}-${i}`}
              className="relative text-sm leading-relaxed"
            >
              <span
                className={`absolute top-1.5 -left-[25px] h-2 w-2 rounded-full ${
                  e.isNew ? "bg-accent" : "bg-rule"
                }`}
              />
              <span className="text-ink-muted text-xs">{when(e.at)}</span>
              {e.isNew ? (
                <span className="text-accent ml-2 text-xs font-semibold uppercase">
                  New to you
                </span>
              ) : null}
              <span className={`block ${e.isNew ? "" : "text-ink-muted"}`}>
                {e.text}
              </span>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
