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
    <header className="border-rule border-b-4 border-double pb-4">
      <div className="text-ink-muted border-rule flex items-baseline justify-between gap-4 border-b pb-2 text-xs tracking-[0.04em] uppercase">
        <span>{formatEditionDate(edition.date)}</span>
        <span>Edition No. {edition.number}</span>
      </div>
      <h1 className="font-display mt-4 text-center text-5xl leading-none font-bold tracking-tight sm:text-7xl">
        The Morning Paper
      </h1>
      <p className="mt-2 text-center text-lg italic">
        {edition.readerName}&rsquo;s Edition
      </p>
      <div className="border-rule mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-2">
        <p className="text-ink-muted text-sm">
          {stats.stories} stories · {stats.sources} sources ·{" "}
          {stats.readingMinutes}
          -minute read
        </p>
        {actions}
      </div>
      {edition.isSample ? (
        <p className="text-accent mt-2 text-xs">
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
      <p className="mt-2 text-lg leading-relaxed italic">{note}</p>
    </section>
  );
}
