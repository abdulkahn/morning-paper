import Link from "next/link";
import type { ReactNode } from "react";
import { archiveSummary, type ArchiveResult } from "@/lib/edition/archive";
import { formatEditionDate } from "@/lib/edition/format";

export const archiveAction = "editorial-button";

export function ArchiveFrame({
  children,
  todayHref = "/today",
  title = "Your archive",
  eyebrow = "The collected editions",
  description = "A record of your mornings. Every edition, just as you received it.",
}: {
  children: ReactNode;
  todayHref?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <header className="border-rule border-b pb-9 sm:pb-12">
        <nav
          aria-label="Paper navigation"
          className="text-ink-muted flex flex-wrap justify-between gap-4 text-sm"
        >
          <span className="editorial-eyebrow">{eyebrow}</span>
          <Link
            href={todayHref}
            className="hover:text-ink underline underline-offset-4"
          >
            Today&rsquo;s Paper <span aria-hidden>↗</span>
          </Link>
        </nav>
        <div className="mt-9 grid items-end gap-5 sm:mt-12 sm:grid-cols-[1.2fr_1fr] sm:gap-12">
          <h1 className="font-display text-5xl leading-none font-normal tracking-[-0.055em] sm:text-7xl">
            {title}
          </h1>
          <p className="text-ink-muted max-w-md text-base leading-relaxed">
            {description}
          </p>
        </div>
      </header>
      {children}
      <footer className="border-rule text-ink-muted mt-16 border-t pt-5 pb-8 text-xs">
        The Morning Paper · Kept as published.
      </footer>
    </main>
  );
}

export function ArchiveState({
  kind,
  todayHref = "/today",
  archiveHref = "/archive",
}: {
  kind: "empty" | "unavailable" | "error" | "missing" | "today";
  todayHref?: string;
  archiveHref?: string;
}) {
  const messages = {
    empty: [
      "Your archive is just getting started.",
      "Once tomorrow’s paper arrives, today’s edition will appear here.",
    ],
    unavailable: [
      "Your saved editions aren’t available yet.",
      "Once your daily editions are ready, you’ll be able to revisit them here.",
    ],
    error: [
      "We couldn’t open your archive.",
      "Please try again in a moment. Your saved editions haven’t been changed.",
    ],
    missing: [
      "We couldn’t find that edition.",
      "It may belong to another reader, or the link may be incomplete. Return to your archive to choose an edition.",
    ],
    today: [
      "Your daily paper is on its way.",
      "Your personal edition isn’t available yet. You can explore a clearly labelled sample in the meantime.",
    ],
  } as const;
  const [title, description] = messages[kind];
  return (
    <section
      aria-label={kind === "error" ? "Archive error" : "Archive status"}
      className="my-8 py-8 sm:py-12"
    >
      <p className="text-ink-muted text-xs tracking-[0.16em] uppercase">
        {kind === "missing" ? "Edition not found" : "The Morning Paper"}
      </p>
      <h2 className="font-display mt-4 max-w-xl text-3xl leading-tight font-normal tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="text-ink-muted mt-4 max-w-lg leading-relaxed">
        {description}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        {kind === "error" && (
          <a className={archiveAction} href={archiveHref}>
            Try again
          </a>
        )}
        {kind === "missing" && (
          <Link className={archiveAction} href={archiveHref}>
            Back to Archive
          </Link>
        )}
        {kind === "today" ? (
          <Link className={archiveAction} href="/paper/demo">
            See a sample edition
          </Link>
        ) : (
          <Link className={archiveAction} href={todayHref}>
            Return to Today&rsquo;s Paper
          </Link>
        )}
      </div>
    </section>
  );
}

export function ArchiveContent({
  result,
  archiveHref = "/archive",
  todayHref = "/today",
}: {
  result: ArchiveResult;
  archiveHref?: string;
  todayHref?: string;
}) {
  if (result.status !== "ready")
    return (
      <ArchiveState
        kind={result.status}
        todayHref={todayHref}
        archiveHref={archiveHref}
      />
    );
  const { editions, currentEditionId } = result.data;
  const historicalCount = editions.filter(
    (entry) => entry.snapshot.id !== currentEditionId,
  ).length;
  if (editions.length === 0)
    return <ArchiveState kind="empty" todayHref={todayHref} />;
  return (
    <section aria-label="Saved editions" className="mt-8">
      <div className="text-ink-muted border-rule/30 flex flex-wrap justify-between gap-3 border-b pb-4 text-xs tracking-[0.08em] uppercase">
        <p>
          {historicalCount}{" "}
          {historicalCount === 1 ? "past edition" : "past editions"}
        </p>
        <p>Newest first · Kept as published</p>
      </div>
      <ol>
        {editions.map((entry) => {
          const { snapshot } = entry;
          const stats = archiveSummary(entry);
          const current = snapshot.id === currentEditionId;
          const date = new Date(`${snapshot.date}T00:00:00Z`);
          const month = date.toLocaleDateString("en-GB", {
            month: "short",
            timeZone: "UTC",
          });
          return (
            <li key={snapshot.id} className="border-rule border-b">
              <article
                aria-labelledby={`edition-${snapshot.id}`}
                className="grid items-start gap-5 py-7 sm:grid-cols-[5rem_1fr] sm:gap-8 lg:grid-cols-[5rem_1fr_auto] lg:py-8"
              >
                <time
                  dateTime={snapshot.date}
                  aria-label={formatEditionDate(snapshot.date)}
                  className="flex items-baseline gap-2 sm:block"
                >
                  <span className="text-ink-muted text-xs tracking-[0.12em] uppercase">
                    {month}
                  </span>{" "}
                  <span className="font-display text-4xl leading-none tracking-tight sm:mt-2 sm:block sm:text-5xl">
                    {date.getUTCDate().toString().padStart(2, "0")}
                  </span>{" "}
                  <span className="text-ink-muted text-sm sm:mt-3 sm:block">
                    {date.getUTCFullYear()}
                  </span>
                </time>
                <div className="min-w-0">
                  <p className="text-ink-muted flex flex-wrap items-center gap-3 text-xs tracking-[0.06em] uppercase">
                    <span
                      className={
                        current ? "bg-ink/5 text-ink rounded-sm px-2 py-1" : ""
                      }
                    >
                      {current ? "Current edition" : "Archived edition"}
                    </span>
                  </p>
                  <h2
                    id={`edition-${snapshot.id}`}
                    className="font-display mt-3 max-w-2xl text-2xl leading-tight font-normal tracking-[-0.03em] break-words sm:text-3xl"
                  >
                    {stats.leadHeadline}
                  </h2>
                  <p className="text-ink-muted mt-4 text-sm">
                    {stats.stories} stories · {stats.readingMinutes} min read
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:col-start-2 lg:col-start-3 lg:mt-8 lg:max-w-44 lg:justify-end">
                  <Link
                    href={`${archiveHref}/${encodeURIComponent(snapshot.id)}`}
                    className={archiveAction}
                  >
                    Open Edition{" "}
                    <span aria-hidden className="ml-4">
                      →
                    </span>
                  </Link>
                  {entry.pdfAvailable ? (
                    <a
                      href={`/api/pdf/${encodeURIComponent(snapshot.id)}`}
                      className="text-ink-muted hover:text-ink inline-flex min-h-11 items-center px-3 text-xs underline underline-offset-4"
                    >
                      PDF{" "}
                      <span className="sr-only">
                        for {formatEditionDate(snapshot.date)}
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="text-ink-muted min-h-11 px-3 py-2 text-xs disabled:cursor-not-allowed"
                    >
                      PDF unavailable
                      <span className="sr-only">
                        {" "}
                        for {formatEditionDate(snapshot.date)}
                      </span>
                    </button>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
      {historicalCount === 0 && (
        <ArchiveState kind="empty" todayHref={todayHref} />
      )}
    </section>
  );
}

export function ArchiveLoading() {
  return (
    <div role="status" className="py-12">
      <p className="text-ink-muted text-sm">Opening your collected editions…</p>
      <div aria-hidden className="border-rule/20 mt-6 space-y-6 border-y py-8">
        <div className="bg-ink/10 h-5 w-1/3" />
        <div className="bg-ink/10 h-9 w-3/4" />
        <div className="bg-ink/10 h-4 w-1/2" />
      </div>
    </div>
  );
}
