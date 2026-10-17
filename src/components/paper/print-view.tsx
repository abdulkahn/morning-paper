import type { EditionSnapshot, StorySnapshot } from "@/lib/edition/schema";
import { editionStats } from "@/lib/edition/schema";
import { formatEditionDate } from "@/lib/edition/format";
import { EditorNote } from "./masthead";
import {
  Explainers,
  KeyPoints,
  Kicker,
  SinceYouLastRead,
  WhyInPaper,
} from "./story-parts";

// Print/PDF rendering of a frozen edition snapshot: A4 pages, three
// newspaper columns, running header and page numbers via @page margin boxes.

/** Escape text for a CSS string literal. */
function cssString(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&").replace(/[\n\r]/g, " ")}"`;
}

export function PrintView({ edition }: { edition: EditionSnapshot }) {
  const stats = editionStats(edition);
  const running = `The Morning Paper · ${edition.readerName}'s Edition · No. ${edition.number}`;
  const pageCss = `
    @page {
      size: A4;
      margin: 16mm 14mm 18mm;
      @top-left { content: ${cssString(running)}; font: 8pt Georgia, serif; color: #555; }
      @top-right { content: ${cssString(formatEditionDate(edition.date))}; font: 8pt Georgia, serif; color: #555; }
      @bottom-center { content: "Page " counter(page) " of " counter(pages); font: 8pt Georgia, serif; color: #555; }
    }
    @page :first { @top-left { content: none; } @top-right { content: none; } }
  `;

  return (
    <div className="print-root">
      <style>{pageCss}</style>

      <header className="border-b-4 border-double border-black pb-2 text-center">
        <div className="flex justify-between border-b border-black pb-1 text-[8pt] tracking-[0.04em] uppercase">
          <span>{formatEditionDate(edition.date)}</span>
          <span>
            {stats.stories} stories · {stats.sources} sources ·{" "}
            {stats.readingMinutes}-minute read
          </span>
          <span>Edition No. {edition.number}</span>
        </div>
        <h1 className="font-display mt-2 text-[44pt] leading-none font-bold tracking-tight">
          The Morning Paper
        </h1>
        <p className="mt-1 text-[11pt] italic">
          {edition.readerName}&rsquo;s Edition
        </p>
        {edition.isSample ? (
          <p className="mt-1 text-[7pt]">
            Sample edition — illustrative content.
          </p>
        ) : null}
      </header>

      <article className="print-lead mt-4 border-b border-black pb-4">
        <Kicker story={edition.lead} />
        <h2 className="font-display mt-1 text-[28pt] leading-[1.05] font-bold tracking-tight">
          {edition.lead.headline}
        </h2>
        <p className="mt-2 text-[11pt] italic">{edition.lead.dek}</p>
        <div className="print-columns mt-3">
          <WhyInPaper text={edition.lead.whyInPaper} />
          {edition.lead.brief.map((p) => (
            <p key={p} className="print-justify mt-2 first:mt-0">
              {p}
            </p>
          ))}
          <div className="mt-3">
            <KeyPoints story={edition.lead} />
          </div>
          <div className="mt-3">
            <Explainers story={edition.lead} />
          </div>
          <PrintSources story={edition.lead} />
        </div>
      </article>

      {edition.editorNote ? (
        <div className="mt-4 border-b border-black pb-4">
          <EditorNote note={edition.editorNote} />
        </div>
      ) : null}

      {edition.sections.map((section) => (
        <section key={section.slug} className="mt-4">
          <h2 className="break-after-avoid border-b-2 border-black pb-1 text-[10pt] font-semibold tracking-[0.04em] uppercase">
            {section.title}
          </h2>
          <div className="print-columns mt-2">
            {section.stories.map((s) => (
              <PrintStory key={s.id} story={s} />
            ))}
          </div>
        </section>
      ))}

      <p className="mt-6 border-t-4 border-double border-black pt-2 text-center text-[10pt] italic">
        You&rsquo;re caught up. See you tomorrow morning.
      </p>
    </div>
  );
}

function PrintStory({ story }: { story: StorySnapshot }) {
  const size =
    story.tier === "major"
      ? "text-[14pt]"
      : story.tier === "standard"
        ? "text-[11pt]"
        : "text-[9.5pt]";
  return (
    <article className="print-story" data-tier={story.tier}>
      {/* Keep kicker, headline and dek together when a story breaks. */}
      <div className="break-inside-avoid">
        <Kicker story={story} />
        <h3 className={`font-display ${size} mt-0.5 leading-tight font-bold`}>
          {story.headline}
        </h3>
        <p className="mt-1 italic">{story.dek}</p>
      </div>
      {story.tier !== "brief" ? (
        <>
          <div className="mt-1">
            <WhyInPaper text={story.whyInPaper} />
          </div>
          {story.continuing ? (
            <div className="mt-2">
              <SinceYouLastRead story={story} />
            </div>
          ) : null}
          {story.brief.map((p) => (
            <p key={p} className="print-justify mt-1">
              {p}
            </p>
          ))}
          {story.explainers.length > 0 ? (
            <div className="mt-2">
              <Explainers story={story} />
            </div>
          ) : null}
        </>
      ) : null}
      <PrintSources story={story} />
    </article>
  );
}

function PrintSources({ story }: { story: StorySnapshot }) {
  return (
    <p className="mt-1 text-[7pt] text-[#555]">
      {story.sources.map((s) => s.name).join(", ")} · {story.sources[0].url}
    </p>
  );
}
