"use client";

import { useState, useTransition } from "react";
import { finishOnboarding } from "../reader-actions";
import type { TopicSlug } from "@/lib/topics";

export interface Duel {
  a: { headline: string; topic: string; section: string };
  b: { headline: string; topic: string; section: string };
}

const LENGTHS = [
  { minutes: 5, label: "5 minutes", detail: "about 5 stories" },
  { minutes: 15, label: "15 minutes", detail: "about 12 stories" },
  { minutes: 25, label: "25 minutes", detail: "about 18 stories" },
] as const;

export function Duels({ duels }: { duels: Duel[] }) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<
    { winner: TopicSlug; loser: TopicSlug }[]
  >([]);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState<5 | 15 | 25>(15);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (winner: string, loser: string) => {
    setChoices((c) => [
      ...c,
      { winner: winner as TopicSlug, loser: loser as TopicSlug },
    ]);
    setStep((s) => s + 1);
  };

  if (step < duels.length) {
    const d = duels[step];
    return (
      <section aria-label="Headline choice" className="mt-8">
        <p className="text-ink-muted text-sm">
          Choice {step + 1} of {duels.length}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          {[d.a, d.b].map((side, i) => (
            <button
              key={side.headline}
              type="button"
              onClick={() =>
                choose(side.topic, i === 0 ? d.b.topic : d.a.topic)
              }
              className="border-rule hover:bg-ink hover:text-paper group rounded-md border p-6 text-left transition-colors"
              style={{ gridColumn: i === 0 ? 1 : 3 }}
            >
              <span className="text-ink-muted group-hover:text-paper text-xs tracking-[0.04em] uppercase">
                {side.section}
              </span>
              <span className="font-display mt-2 block text-xl leading-snug font-bold">
                {side.headline}
              </span>
            </button>
          ))}
          <span className="text-ink-muted self-center text-center text-sm italic sm:[grid-column:2] sm:[grid-row:1]">
            or
          </span>
        </div>
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          className="text-ink-muted hover:text-ink mt-4 text-sm underline underline-offset-4"
        >
          Neither — skip
        </button>
      </section>
    );
  }

  return (
    <form
      className="mt-8 space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await finishOnboarding({
              name: name.trim() || "Reader",
              minutes,
              choices: choices.length
                ? choices
                : [{ winner: "world", loser: "culture" }],
            });
          } catch (err) {
            if (err && typeof err === "object" && "digest" in err) throw err; // redirect
            setError("Couldn't save your choices. Please try again.");
          }
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">
          What should your paper call you?
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name"
          className="border-rule bg-paper mt-2 block w-full rounded-md border px-3 py-2"
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">
          How long is your morning read?
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {LENGTHS.map((l) => (
            <label
              key={l.minutes}
              className={`cursor-pointer rounded-md border p-4 ${minutes === l.minutes ? "border-ink bg-ink text-paper" : "border-rule"}`}
            >
              <input
                type="radio"
                name="minutes"
                className="sr-only"
                checked={minutes === l.minutes}
                onChange={() => setMinutes(l.minutes)}
              />
              <span className="block font-medium">{l.label}</span>
              <span className="text-sm opacity-75">{l.detail}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-6 py-3 text-sm font-medium disabled:opacity-60"
      >
        {pending
          ? "Your editor is building your paper…"
          : "Build my first paper"}
      </button>
      {error ? (
        <p role="alert" className="text-accent text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
