"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Whether the user prefers reduced motion. Backed by `useSyncExternalStore` over `matchMedia`, so it
 * works identically inside and outside the r3f <Canvas>: it subscribes to a browser API, not React
 * Context, so the "context doesn't cross the Canvas" rule (which forces the pieceLabels prop) does
 * not apply here — 3D components may call this hook directly.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
