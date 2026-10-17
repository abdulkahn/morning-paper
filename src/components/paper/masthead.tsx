import type { ReactNode } from "react";
import { editionStats, type EditionSnapshot } from "@/lib/edition/schema";
import { formatEditionDate } from "@/lib/edition/format";

export function Masthead({
  edition,
  actions,
}: {
  edition: EditionSnapshot;
  actions?: ReactNode;
}) {
  const stats = editionStats(edition);
  return (
    <header className="border-rule border-b pb-5">
      <div className="text-ink-muted flex flex-wrap items-baseline justify-between gap-3 text-[10px] tracking-[0.1em] uppercase">
        <span>{formatEditionDate(edition.date)}</span>
        <span>Edition No. {edition.number}</span>
      </div>
      <h1 className="font-display mt-5 text-5xl leading-none font-normal tracking-[-0.055em] sm:text-7xl">
        The Morning Paper
      </h1>
      <p className="text-ink-muted mt-3 text-sm">
        {edition.readerName}&rsquo;s Edition
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-muted text-sm">
          {stats.stories} stories · {stats.sources} sources ·{" "}
          {stats.readingMinutes}
          -minute read
        </p>
        {actions}
      </div>
      {edition.isSample ? (
        <p className="text-ink-muted mt-4 text-xs">
          Sample edition — illustrative content for layout preview.
        </p>
      ) : null}
    </header>
  );
}

export function EditorNote({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <section aria-label="From your editor" className="break-inside-avoid">
      <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
        From your editor
      </p>
      <p className="mt-2 font-serif text-lg leading-relaxed">{note}</p>
    </section>
  );
}
