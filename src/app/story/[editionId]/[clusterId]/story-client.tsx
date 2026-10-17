"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markStoryRead, storyFeedback } from "@/app/reader-actions";

/** Records that the reader opened this story (once per mount). */
export function ReadTracker({
  editionId,
  clusterId,
}: {
  editionId: string;
  clusterId: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    markStoryRead(editionId, clusterId).catch(() => {
      // Reading still works; memory just won't update this time.
    });
  }, [editionId, clusterId]);
  return null;
}

export function StoryFeedback({
  editionId,
  clusterId,
}: {
  editionId: string;
  clusterId: string;
}) {
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const send = (kind: "more_like_this" | "less_like_this") =>
    startTransition(async () => {
      await storyFeedback(editionId, clusterId, kind);
      setSent(kind);
    });

  return (
    <section aria-label="Feedback" className="border-rule border-t pt-6">
      <p className="text-sm font-medium">Tell your editor</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !!sent}
          onClick={() => send("more_like_this")}
          className="border-rule hover:bg-ink hover:text-paper rounded-md border px-4 py-2 text-sm disabled:opacity-60"
        >
          More like this
        </button>
        <button
          type="button"
          disabled={pending || !!sent}
          onClick={() => send("less_like_this")}
          className="border-rule hover:bg-ink hover:text-paper rounded-md border px-4 py-2 text-sm disabled:opacity-60"
        >
          Less like this
        </button>
      </div>
      {sent ? (
        <p role="status" className="text-ink-muted mt-3 text-sm">
          Noted. Today&rsquo;s paper stays as it is — tomorrow&rsquo;s will
          reflect this.
        </p>
      ) : null}
    </section>
  );
}
