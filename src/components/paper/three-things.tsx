"use client";

import { useState, useTransition } from "react";
import { answerRecall } from "@/app/reader-actions";
import type { RecallItem } from "@/lib/edition/schema";

// End-of-paper recall: three quick questions about today's key facts. A miss
// is remembered and the fact comes back in a future edition.

type Result = { correct: boolean; answerIndex: number; fact: string | null };

export function ThreeThings({
  editionId,
  items,
}: {
  editionId: string;
  items: RecallItem[];
}) {
  if (!items.length) return null;
  return (
    <section
      aria-labelledby="three-things"
      className="border-rule mt-16 border-t-4 border-double pt-8"
    >
      <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
        Three Things
      </p>
      <h2 id="three-things" className="font-display mt-1 text-3xl font-bold">
        What do you remember?
      </h2>
      <ol className="mt-6 grid gap-8 md:grid-cols-3">
        {items.map((item, i) => (
          <Question
            key={item.factId}
            n={i + 1}
            editionId={editionId}
            item={item}
          />
        ))}
      </ol>
    </section>
  );
}

function Question({
  n,
  editionId,
  item,
}: {
  n: number;
  editionId: string;
  item: RecallItem;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="space-y-3" data-testid="recall-question">
      {item.resurfaced ? (
        <p className="text-accent text-xs font-medium uppercase">
          Remember this? You missed it last time
        </p>
      ) : null}
      <p className="text-ink-muted text-xs">
        {n}. From: {item.storyHeadline}
      </p>
      <p className="font-medium">{item.question}</p>
      <div className="grid gap-2">
        {item.options.map((option, i) => {
          const state = !result
            ? chosen === i
              ? "border-ink"
              : "border-rule"
            : i === result.answerIndex
              ? "border-green-700 bg-green-700/10"
              : i === chosen
                ? "border-accent bg-accent/10"
                : "border-rule opacity-60";
          return (
            <button
              key={option}
              type="button"
              disabled={!!result || pending}
              onClick={() => {
                setChosen(i);
                startTransition(async () => {
                  setResult(await answerRecall(editionId, item.factId, i));
                });
              }}
              className={`rounded-md border px-3 py-2 text-left text-sm ${state}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {result ? (
        <p
          className={`text-sm ${result.correct ? "text-green-700" : "text-accent"}`}
        >
          {result.correct
            ? "Correct — that one stuck."
            : "Not quite. Your editor will bring this back in a future paper."}
        </p>
      ) : null}
    </li>
  );
}
