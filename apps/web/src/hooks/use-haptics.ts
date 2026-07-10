"use client";

import { useCallback } from "react";

const supported = typeof navigator !== "undefined" && "vibrate" in navigator;

/**
 * Light vibration feedback mirroring the sound cues (select/move/capture/win). No-op when disabled or
 * unsupported (iOS Safari / desktop have no `navigator.vibrate`). Vibration needs sticky user
 * activation, which is always true by the time a game is in progress.
 */
export function useHaptics(enabled: boolean) {
  const buzz = useCallback(
    (pattern: number | number[]) => {
      if (enabled && supported) navigator.vibrate(pattern);
    },
    [enabled]
  );
  return {
    supported,
    select: useCallback(() => buzz(8), [buzz]),
    move: useCallback((kind: "move" | "capture") => buzz(kind === "capture" ? [24, 40, 48] : 16), [buzz]),
    win: useCallback(() => buzz([40, 80, 40, 80, 120]), [buzz])
  };
}
