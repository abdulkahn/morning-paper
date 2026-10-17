"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ListenPart } from "@/lib/edition/listen";

/**
 * "Listen to your paper": reads the edition aloud with the browser's own
 * speech engine. Nothing is sent anywhere; if the browser has no speech
 * support the button explains that instead.
 */
const noop = () => () => {};

export function ListenButton({ parts }: { parts: ListenPart[] }) {
  const supported = useSyncExternalStore(
    noop,
    () => "speechSynthesis" in window,
    () => true,
  );
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [current, setCurrent] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    return () => {
      stopped.current = true;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function speakFrom(index: number) {
    const synth = window.speechSynthesis;
    if (index >= parts.length || stopped.current) {
      setState("idle");
      setCurrent(0);
      return;
    }
    setCurrent(index);
    const u = new SpeechSynthesisUtterance(parts[index].text);
    u.lang = "en-GB";
    u.rate = 1;
    u.onend = () => speakFrom(index + 1);
    u.onerror = () => {
      if (!stopped.current) speakFrom(index + 1);
    };
    synth.speak(u);
  }

  function play() {
    const synth = window.speechSynthesis;
    if (state === "paused") {
      synth.resume();
      setState("playing");
      return;
    }
    stopped.current = false;
    synth.cancel();
    setState("playing");
    speakFrom(0);
  }

  function pause() {
    window.speechSynthesis.pause();
    setState("paused");
  }

  function stop() {
    stopped.current = true;
    window.speechSynthesis.cancel();
    setState("idle");
    setCurrent(0);
  }

  if (!supported) {
    return (
      <p className="text-ink-muted text-sm">
        Listening isn&rsquo;t supported in this browser.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2" data-testid="listen">
      <div className="flex gap-2">
        {state === "playing" ? (
          <button type="button" onClick={pause} className="editorial-button">
            ❚❚ Pause
          </button>
        ) : (
          <button type="button" onClick={play} className="editorial-button">
            ▶ {state === "paused" ? "Resume" : "Listen to your paper"}
          </button>
        )}
        {state !== "idle" ? (
          <button
            type="button"
            onClick={stop}
            className="min-h-11 border border-current/30 px-4 py-2 text-sm"
          >
            Stop
          </button>
        ) : null}
      </div>
      {state !== "idle" ? (
        <p className="text-ink-muted max-w-xs text-xs" aria-live="polite">
          Now reading ({current + 1}/{parts.length}): {parts[current].label}
        </p>
      ) : null}
    </div>
  );
}
