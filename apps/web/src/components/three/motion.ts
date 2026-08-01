import type { Position } from "@animal-chess/game-core";

/**
 * Shared movement timing. The piece animation ([AnimalPiece]) and the one-shot move VFX
 * ([effects.tsx] `MoveFx`) must agree on how long a hop takes, otherwise the landing dust/ripple
 * fires while the animal is still mid-air. Both import from here — never re-derive the numbers.
 */

/** Euclidean distance in board cells (lion/tiger water jumps are 3–4). */
export function tileDistance(a: Position, b: Position): number {
  return Math.hypot(a.row - b.row, a.col - b.col);
}

/** Seconds a piece spends travelling `dist` cells. Reduced motion collapses it to a snap. */
export function travelDuration(dist: number, reduced?: boolean): number {
  if (reduced) return 0.001;
  return Math.min(0.6, 0.3 + dist * 0.08);
}

/** Peak height of the leap; a long jump (over water) clears visibly higher than a one-cell hop. */
export function hopHeight(dist: number, reduced?: boolean): number {
  if (reduced) return 0;
  return dist > 1.2 ? 0.62 + Math.min(dist, 4) * 0.16 : 0.52;
}

/**
 * Vertical profile of a leap, 0→1→0 over the travel. The `**0.72` flattens the top so the animal
 * hangs in the air for a beat (a jump) instead of tracing a lazy sine bump (a float).
 */
export function hopArc(k: number): number {
  return Math.sin(Math.PI * k) ** 0.72;
}

/** easeInOutCubic — slow launch, fast mid-flight, soft landing. */
export function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

/** Interpolate yaw the short way round so a turn never spins through ±π. */
export function angleTowards(current: number, target: number, k: number): number {
  const delta = ((((target - current + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return current + delta * k;
}
