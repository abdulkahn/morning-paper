"use client";

import Link from "next/link";

export default function ArchiveError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-accent text-xs tracking-widest uppercase">
        The Morning Paper
      </p>
      <h1 className="font-display mt-4 text-4xl font-bold">
        We couldn&rsquo;t open your archive.
      </h1>
      <p className="text-ink-muted mt-4">
        Please try again in a moment. Your saved editions haven&rsquo;t been
        changed.
      </p>
      <div className="mt-8 flex flex-wrap gap-6">
        <button
          type="button"
          onClick={reset}
          className="border-rule min-h-11 border px-5 py-2"
        >
          Try again
        </button>
        <Link href="/archive" className="py-3 underline underline-offset-4">
          Back to Archive
        </Link>
        <Link href="/today" className="py-3 underline underline-offset-4">
          Today&rsquo;s Paper
        </Link>
      </div>
    </main>
  );
}
