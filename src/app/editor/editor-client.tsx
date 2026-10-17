"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { WeightDiff } from "@/lib/editor/talk";
import {
  applyInstruction,
  previewInstruction,
  setConceptKnown,
} from "./actions";

const pct = (w: number) => `${Math.round(w * 100)}%`;

export function TalkToEditor() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{
    reply: string;
    diff: WeightDiff[];
  } | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section
      aria-labelledby="talk"
      className="border-rule rounded-md border p-6"
    >
      <h2 id="talk" className="font-display text-2xl font-bold">
        Talk to your editor
      </h2>
      <p className="text-ink-muted mt-1 text-sm">
        Say what you want more or less of, in your own words.
      </p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setApplied(false);
          startTransition(async () => {
            try {
              setPreview(await previewInstruction(text));
            } catch {
              setError("Your editor couldn't process that. Please try again.");
            }
          });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Less US political drama. More Pakistani startups and AI research."
          aria-label="Instruction for your editor"
          className="border-rule bg-paper flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending || text.trim().length < 2}
          className="bg-ink text-paper rounded-md px-5 py-2 text-sm font-medium disabled:opacity-60"
        >
          {pending && !preview ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-accent mt-3 text-sm">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-6" data-testid="editor-preview">
          <p className="italic">&ldquo;{preview.reply}&rdquo;</p>
          {preview.diff.length ? (
            <>
              <ul className="mt-4 space-y-2 text-sm">
                {preview.diff.map((d) => (
                  <li
                    key={d.topic}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="font-medium">{d.name}</span>
                    <span className="tabular-nums">
                      {d.mutedBefore ? "muted" : pct(d.before)}
                      <span className="text-ink-muted"> → </span>
                      <span
                        className={
                          d.after > d.before ? "text-green-700" : "text-accent"
                        }
                      >
                        {d.mutedAfter ? "muted" : pct(d.after)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {applied ? (
                <p role="status" className="mt-4 text-sm text-green-700">
                  Done. Your future editions will reflect this; today&rsquo;s
                  paper stays as it is.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await applyInstruction(
                          preview.diff.map((d) => ({
                            topic: d.topic,
                            after: d.after,
                            mutedAfter: d.mutedAfter,
                          })),
                        );
                        setApplied(true);
                        router.refresh();
                      } catch {
                        setError(
                          "Couldn't save that change. Please try again.",
                        );
                      }
                    })
                  }
                  className="bg-accent text-paper mt-4 rounded-md px-5 py-2 text-sm font-medium disabled:opacity-60"
                >
                  Apply to future papers
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function KnownToggle({
  conceptId,
  known,
}: {
  conceptId: string;
  known: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setConceptKnown(conceptId, !known);
          router.refresh();
        })
      }
      className="border-rule hover:bg-ink hover:text-paper shrink-0 rounded-md border px-2 py-1 text-xs disabled:opacity-60"
    >
      {known ? "Explain again" : "I know this"}
    </button>
  );
}
