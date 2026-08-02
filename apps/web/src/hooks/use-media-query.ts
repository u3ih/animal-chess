"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reactive `matchMedia`. Server render (and the very first client render) returns `false`, so callers
 * must treat a match as progressive enhancement — never gate content that must exist for SEO/SSR on it.
 * Backed by `useSyncExternalStore` for the same reason as {@link useReducedMotion}: it subscribes to a
 * browser API rather than React Context.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
