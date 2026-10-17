import {
  Oswald,
  Playfair_Display,
  Source_Serif_4,
  UnifrakturCook,
} from "next/font/google";
import type { CSSProperties } from "react";
import { formatEditionDate } from "@/lib/edition/format";
import { topicImage, type StoryImage } from "@/lib/edition/images";
import {
  editionStats,
  type EditionSnapshot,
  type StorySnapshot,
} from "@/lib/edition/schema";
import "./broadsheet.css";

// Print/PDF rendering of a frozen edition snapshot as a broadsheet: front
// page (nameplate, lead photo, editor's note, second leads), then sections
// flowing through three columns, then Three Things and the sign-off.

const blackletter = UnifrakturCook({ weight: "700", subsets: ["latin"] });
const display = Playfair_Display({
  weight: ["700", "800"],
  subsets: ["latin"],
});
const body = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
});
const sans = Oswald({ weight: ["400", "600", "700"], subsets: ["latin"] });

/** Escape text for a CSS string literal. */
function cssString(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&").replace(/[\n\r]/g, " ")}"`;
}

/** Feed thumbnails are tiny; ask the publisher's CDN for a print-size copy. */
function printSize(url: string): string {
  // BBC: https://ichef.bbci.co.uk/ace/standard/240/...
  return url.replace(
    /(ichef\.bbci\.co\.uk\/(?:ace\/(?:standard|ws)|news))\/\d+\//,
    "$1/976/",
  );
}

function Photo({
  image,
  className,
}: {
  image: StoryImage | null | undefined;
  className?: string;
}) {
  if (!image) return null;
  return (
    <figure className={`np-photo ${className ?? ""}`} data-photo>
      {/* eslint-disable-next-line @next/next/no-img-element -- printed by Chromium, not served */}
      <img src={printSize(image.url)} alt={image.alt} />
      <figcaption>
        {image.kind === "topic" ? "Illustration. " : ""}Photo: {image.credit}
      </figcaption>
    </figure>
  );
}

const sources = (s: StorySnapshot) => s.sources.map((x) => x.name).join(", ");

function ForYou({ story }: { story: StorySnapshot }) {
  return story.whyInPaper ? (
    <p className="np-foryou">For you: {story.whyInPaper}</p>
  ) : null;
}

function SinceYouLastRead({ story }: { story: StorySnapshot }) {
  if (!story.continuing) return null;
  const { newFacts, changedFacts } = story.continuing;
  return (
    <aside className="np-box-shaded">
      <div className="np-kicker">
        Since you last read ·{" "}
        {new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(new Date(story.continuing.lastReadAt))}
      </div>
      <ul>
        {changedFacts.map((f) => (
          <li key={f}>
            <b>Changed:</b> {f}
          </li>
        ))}
        {newFacts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </aside>
  );
}

function Glossary({ story }: { story: StorySnapshot }) {
  if (!story.explainers.length) return null;
  return (
    <dl className="np-box-shaded np-glossary">
      <div className="np-kicker">New to you</div>
      {story.explainers.map((e) => (
        <div key={e.term}>
          <dt>{e.term}.</dt> <dd>{e.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Body({ story, dropcap }: { story: StorySnapshot; dropcap?: boolean }) {
  return (
    <div className="np-body">
      {story.brief.map((p, i) => (
        <p key={p} className={dropcap && i === 0 ? "np-dropcap" : undefined}>
          {p}
        </p>
      ))}
    </div>
  );
}

function FlowStory({
  story,
  continued = false,
}: {
  story: StorySnapshot;
  continued?: boolean;
}) {
  const major = story.tier === "major";
  return (
    <article className={`np-story ${major ? "np-major" : ""}`}>
      <div className="np-story-top">
        {major && !continued ? <Photo image={story.image} /> : null}
        <div className="np-kicker">
          {continued ? "Continued from the front page · " : ""}
          {story.continuing ? "Continuing · " : ""}
          {story.topic}
        </div>
        <h3 className="np-head">{story.headline}</h3>
        <p className="np-dek">{story.dek}</p>
      </div>
      <ForYou story={story} />
      <SinceYouLastRead story={story} />
      <Body story={story} />
      {story.whyItMatters ? (
        <p className="np-body">
          <b>Why it matters:</b> {story.whyItMatters}
        </p>
      ) : null}
      <Glossary story={story} />
      <p className="np-source">{sources(story)}</p>
    </article>
  );
}

export function PrintView({ edition }: { edition: EditionSnapshot }) {
  const stats = editionStats(edition);
  const lead = edition.lead;
  const date = formatEditionDate(edition.date);
  const running = `The Morning Paper · ${edition.readerName}'s Edition · No. ${edition.number}`;
  const headerFont = `7.5pt ${display.style.fontFamily}, Georgia, serif`;
  const pageCss = `
    @page {
      size: A4;
      margin: 13mm 12mm 15mm;
      background: #f5f0e4;
      @top-left { content: ${cssString(running)}; font: ${headerFont}; color: #57524a; }
      @top-right { content: ${cssString(date)}; font: ${headerFont}; color: #57524a; }
      @bottom-center { content: "— " counter(page) " —"; font: ${headerFont}; color: #57524a; }
    }
    @page :first { @top-left { content: none; } @top-right { content: none; } }
  `;

  // Front page carries the lead and the two strongest section stories;
  // everything else flows inside, section by section, briefs gathered last.
  const sectionStories = edition.sections.flatMap((s) =>
    s.stories.map((story) => ({ story, section: s.title })),
  );
  const seconds = sectionStories
    .filter((x) => x.story.tier !== "brief")
    .slice(0, 2);
  const used = new Set(seconds.map((x) => x.story.id));
  const inside = edition.sections
    .map((s) => ({
      title: s.title,
      stories: s.stories.filter(
        (st) => !used.has(st.id) && st.tier !== "brief",
      ),
    }))
    .filter((s) => s.stories.length);
  const briefs = sectionStories.filter((x) => x.story.tier === "brief");
  const letters = ["A", "B", "C", "D"];

  return (
    <div
      className="print-root np"
      style={
        {
          "--np-blackletter": blackletter.style.fontFamily,
          "--np-display": display.style.fontFamily,
          "--np-body": body.style.fontFamily,
          "--np-sans": sans.style.fontFamily,
        } as CSSProperties
      }
    >
      <style>{pageCss}</style>

      {/* ---------- Masthead ---------- */}
      <header>
        <div className="np-ears">
          <div className="np-ear">
            <strong>Edition No. {edition.number}</strong>
            {edition.readerName}&rsquo;s personal edition
          </div>
          <p className="np-motto">
            &ldquo;The paper that remembers what you already know&rdquo;
          </p>
          <div className="np-ear np-ear-right">
            <strong>{stats.readingMinutes}-minute read</strong>
            {stats.stories} stories · {stats.sources} sources
          </div>
        </div>
        <h1 className="np-nameplate">The Morning Paper</h1>
        <div className="np-dateline">
          <span>{date}</span>
          <span>Printed for {edition.readerName}</span>
          <span>
            {edition.isSample
              ? "Sample edition — illustrative content."
              : "Personal edition"}
          </span>
        </div>
        <nav className="np-index" aria-label="Inside today">
          <b>Inside today</b>
          {edition.sections.map((s) => (
            <span key={s.slug}>
              {s.title}{" "}
              <span style={{ color: "#57524a" }}>({s.stories.length})</span>
            </span>
          ))}
        </nav>
      </header>

      {/* ---------- Front page lead ---------- */}
      <section className="np-lead">
        <div className="np-lead-head">
          <div className="np-kicker">
            {lead.continuing ? "Continuing story · " : ""}
            {lead.topic}
          </div>
          <h2 className="np-head">{lead.headline}</h2>
          <p className="np-dek">{lead.dek}</p>
        </div>
        <div>
          <Photo
            className="np-lead-photo"
            image={lead.image ?? topicImage(lead.topic)}
          />
          <ForYou story={lead} />
          <SinceYouLastRead story={lead} />
          <div className="np-lead-body">
            <Body story={lead} dropcap />
            {lead.whyItMatters ? (
              <p className="np-body">
                <b>Why it matters:</b> {lead.whyItMatters}
              </p>
            ) : null}
            <p className="np-source">{sources(lead)}</p>
          </div>
        </div>
        <aside className="np-side">
          {edition.editorNote ? (
            <div className="np-box">
              <div className="np-box-title">From your editor</div>
              <p className="np-editor">{edition.editorNote}</p>
            </div>
          ) : null}
          {lead.keyPoints.length ? (
            <div className="np-box">
              <div className="np-box-title">The key points</div>
              <ul>
                {lead.keyPoints.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Glossary story={lead} />
        </aside>
      </section>

      {seconds.length ? (
        <section className="np-seconds">
          {seconds.map(({ story, section }) => (
            <article key={story.id} className="np-second">
              <Photo image={story.image ?? topicImage(story.topic)} />
              <div>
                <div className="np-kicker">
                  {story.continuing ? "Continuing · " : ""}
                  {section}
                </div>
                <h3 className="np-head">{story.headline}</h3>
                <p className="np-dek">{story.dek}</p>
                <p className="np-source">
                  {sources(story)} · <b>Continued inside</b>
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {/* ---------- Inside pages ---------- */}
      <div className="np-flow">
        {inside.map((s) => (
          <section key={s.title}>
            <h2 className="np-flag">{s.title}</h2>
            {s.stories.map((story) => (
              <FlowStory
                key={story.id}
                story={story}
                continued={used.has(story.id)}
              />
            ))}
          </section>
        ))}

        {briefs.length ? (
          <section className="np-box np-briefs">
            <div className="np-box-title">In brief</div>
            <ul>
              {briefs.map(({ story, section }) => (
                <li key={story.id}>
                  <span className="np-kicker">{section} · </span>
                  <b>{story.headline}.</b> {story.dek}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {edition.recall.length ? (
          <section className="np-box np-quiz">
            <div className="np-box-title">
              Three Things · What do you remember?
            </div>
            <ol>
              {edition.recall.map((q) => (
                <li key={q.factId}>
                  {q.resurfaced ? <i>(Back again) </i> : null}
                  {q.question}
                  <div className="np-options">
                    {q.options.map((o, i) => (
                      <span key={o}>
                        {letters[i]}) {o}
                        {i < q.options.length - 1 ? "   " : ""}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <p className="np-answers">
              Answers:{" "}
              {edition.recall
                .map((q, i) => `${i + 1} ${letters[q.answerIndex]}`)
                .join(" · ")}
            </p>
          </section>
        ) : null}

        <p className="np-sign-off">
          You&rsquo;re caught up. See you tomorrow morning.
        </p>
      </div>
    </div>
  );
}
