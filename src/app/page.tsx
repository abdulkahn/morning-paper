import Link from "next/link";
import { StartButton } from "./start/start-button";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="editorial-eyebrow text-ink-muted mb-6">
            A personal morning paper
          </p>
          <h1 id="home-title">
            Your world.
            <br />
            In perspective.
          </h1>
        </div>
        <div className="home-hero-copy">
          <p>A paper that remembers what you already know.</p>
          <p className="text-ink-muted mt-3 !text-sm">
            One considered edition, shaped around your interests. Read what
            matters, understand what changed, and get on with your day.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <StartButton />
            <Link
              href="/paper/demo"
              className="text-sm underline underline-offset-4"
            >
              See a sample edition <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section
        className="home-preview"
        aria-label="A look inside a sample edition"
      >
        <div className="home-preview-paper">
          <div className="flex flex-wrap justify-between gap-2 border-b border-[#cecec6] pb-3 text-[10px] tracking-widest uppercase">
            <span>A look inside</span>
            <span>Sample edition · Illustrative content</span>
          </div>
          <p className="home-preview-title border-b border-[#cecec6] py-5">
            The Morning Paper.
          </p>
          <div className="home-preview-grid">
            <div>
              <p className="editorial-eyebrow mb-3 text-[#64665f]">
                {SAMPLE_EDITION.lead.topic} / The lead
              </p>
              <h3>{SAMPLE_EDITION.lead.headline}</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#64665f]">
                {SAMPLE_EDITION.lead.dek}
              </p>
              <Link
                href="/paper/demo"
                className="mt-6 inline-flex gap-6 text-xs"
              >
                Explore the sample <span aria-hidden>↗</span>
              </Link>
            </div>
            <aside className="border-l border-[#cecec6] pl-7">
              <p className="editorial-eyebrow text-[#64665f]">
                The editor’s approach
              </p>
              <p className="mt-4 font-serif text-xl leading-relaxed">
                A little context.
                <br />A clearer picture.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#64665f]">
                Your lead story. The developments that matter. Original
                reporting, always a click away.
              </p>
            </aside>
          </div>
        </div>
      </section>
      <section
        className="home-principles"
        aria-label="A more considered way to read"
      >
        <div>
          <span className="editorial-eyebrow text-ink-muted">
            01 / Personal
          </span>
          <h2>Your interests. Your edition.</h2>
          <p>
            Choose the headlines that catch your eye. Your paper starts with
            what matters to you.
          </p>
        </div>
        <div>
          <span className="editorial-eyebrow text-ink-muted">02 / Finite</span>
          <h2>A beginning. And an end.</h2>
          <p>
            A complete morning read, with a clear finish. Then you’re caught up.
          </p>
        </div>
        <div>
          <span className="editorial-eyebrow text-ink-muted">03 / Kept</span>
          <h2>Worth coming back to.</h2>
          <p>
            Revisit past editions as you received them. The same stories, in the
            same order.
          </p>
        </div>
      </section>
      <footer className="border-rule text-ink-muted flex flex-wrap justify-between gap-4 border-t py-7 text-xs">
        <span>The Morning Paper</span>
        <span>A little perspective. Every morning.</span>
      </footer>
    </main>
  );
}
