import type { Player } from "@animal-chess/game-core";

/** Per-player seconds remaining on the current move. */
export type ClockSnapshot = Record<Player, number>;

const INITIAL: ClockSnapshot = { red: 90, blue: 90 };

/**
 * A tiny external store for the per-move clock, kept out of React state so ticking it once a second
 * does not re-render the whole game tree. Only a leaf `BadgeClock` subscribes via useSyncExternalStore.
 */
let snapshot: ClockSnapshot = INITIAL;
const listeners = new Set<() => void>();

/** Push a new clock reading; keeps the same object reference when values are unchanged (no notify). */
export function setClock(next: ClockSnapshot): void {
  if (next.red === snapshot.red && next.blue === snapshot.blue) return;
  snapshot = { red: next.red, blue: next.blue };
  for (const listener of listeners) listener();
}

export function getClockSnapshot(): ClockSnapshot {
  return snapshot;
}

/** Constant reference for SSR — useSyncExternalStore requires a stable server snapshot. */
export function getClockServerSnapshot(): ClockSnapshot {
  return INITIAL;
}

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
