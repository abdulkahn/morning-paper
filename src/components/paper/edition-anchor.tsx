"use client";

import { useEffect } from "react";

/** Restore the requested story after Next's initial hydration scroll handling. */
export function EditionAnchor() {
  useEffect(() => {
    let frame = 0;
    const restore = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let id: string;
        try {
          id = decodeURIComponent(window.location.hash.slice(1));
        } catch {
          return;
        }
        if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    };
    restore();
    window.addEventListener("hashchange", restore);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
  return null;
}
