import type { StorySnapshot } from "@/lib/edition/schema";

// Small pieces of a story shared by the web paper and the print/PDF layout.

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function Kicker({ story }: { story: StorySnapshot }) {
  return (
    <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
      {story.continuing ? (
        <span className="text-accent">Continuing story · </span>
      ) : null}
      {story.topic}
    </p>
  );
}

export function WhyInPaper({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="text-ink-muted text-sm">
      <span className="text-accent font-medium">
        Why this is in your paper:{" "}
      </span>
      {text}
    </p>
  );
}

export function SinceYouLastRead({ story }: { story: StorySnapshot }) {
  const c = story.continuing;
  if (!c) return null;
  const counts = [
    c.newFacts.length > 0 &&
      `${c.newFacts.length} new ${c.newFacts.length === 1 ? "fact" : "facts"}`,
    c.changedFacts.length > 0 &&
      `${c.changedFacts.length} ${c.changedFacts.length === 1 ? "change" : "changes"}`,
  ].filter(Boolean);

  return (
    <aside
      aria-label="Since you last read"
      className="border-accent bg-accent/5 break-inside-avoid border-l-2 py-2 pl-3"
    >
      <p className="text-accent text-xs font-medium tracking-[0.04em] uppercase">
        Since you last read · {SHORT_DATE.format(new Date(c.lastReadAt))}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {c.changedFacts.map((f) => (
          <li key={f}>
            <span className="text-accent font-medium">Changed: </span>
            {f}
          </li>
        ))}
        {c.newFacts.map((f) => (
          <li key={f}>
            <span aria-hidden className="text-accent font-medium">
              +{" "}
            </span>
            {f}
          </li>
        ))}
      </ul>
      <p className="text-ink-muted mt-2 text-xs">{counts.join(" · ")}</p>
    </aside>
  );
}

export function Explainers({ story }: { story: StorySnapshot }) {
  if (story.explainers.length === 0) return null;
  return (
    <aside aria-label="New to you" className="break-inside-avoid">
      <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
        New to you
      </p>
      <dl className="mt-2 space-y-2 text-sm">
        {story.explainers.map((e) => (
          <div key={e.term}>
            <dt className="inline font-semibold">{e.term}. </dt>
            <dd className="text-ink-muted inline">{e.text}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function KeyPoints({ story }: { story: StorySnapshot }) {
  if (story.keyPoints.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {story.keyPoints.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

export function SourceLine({ story }: { story: StorySnapshot }) {
  const [first, ...rest] = story.sources;
  return (
    <p className="text-ink-muted text-xs">
      {first.name}
      {rest.length > 0 ? ` + ${rest.length} more` : ""} · {story.readMinutes}{" "}
      min ·{" "}
      <a
        href={first.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-ink underline underline-offset-2"
      >
        Read original
      </a>
    </p>
  );
}
