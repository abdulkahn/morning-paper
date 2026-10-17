"use client";

import { useActionState } from "react";
import { startReader, type StartState } from "./actions";

const initial: StartState = { error: null };

export function StartButton() {
  const [state, action, pending] = useActionState(
    async () => startReader(),
    initial,
  );
  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Opening your paper…" : "Start my paper"}
      </button>
      {state.error && !pending ? (
        <p role="alert" className="text-accent text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
