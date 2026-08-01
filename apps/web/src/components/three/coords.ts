import type { Position } from "@animal-chess/game-core";
import { BOARD_COLS, BOARD_ROWS, DENS, TRAPS, WATER } from "@animal-chess/game-core";

export const BOARD_W = BOARD_COLS; // 7
export const BOARD_H = BOARD_ROWS; // 9

const CX = (BOARD_COLS - 1) / 2; // 3
const CZ = (BOARD_ROWS - 1) / 2; // 4

/** Grid cell -> world position. Keeps the original x=col-3, z=row-4 convention. */
export function tileToWorld(pos: Position): [number, number, number] {
  return [pos.col - CX, 0, pos.row - CZ];
}

export type TerrainKind = "grass" | "water" | "trap-red" | "trap-blue" | "den-red" | "den-blue";

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function getTerrain(pos: Position): TerrainKind {
  if (samePos(pos, DENS.red)) return "den-red";
  if (samePos(pos, DENS.blue)) return "den-blue";
  if (TRAPS.red.some((t) => samePos(t, pos))) return "trap-red";
  if (TRAPS.blue.some((t) => samePos(t, pos))) return "trap-blue";
  if (WATER.some((w) => samePos(w, pos))) return "water";
  return "grass";
}

/** All board cells, row-major. */
export const ALL_CELLS: Position[] = Array.from({ length: BOARD_ROWS * BOARD_COLS }, (_, i) => ({
  row: Math.floor(i / BOARD_COLS),
  col: i % BOARD_COLS
}));

// --- Relief / elevation --------------------------------------------------
// The board is a terraced bowl: each side's home rows sit on a raised plateau
// that steps gently down to a deep central river. Pieces ride this surface, so
// a march toward the enemy den visibly climbs. Water is carved well below the
// land so the moat reads as real depth under the camera tilt.

/** World Y where the shared stone foundation begins; tile columns drop to here. */
export const FOUNDATION_Y = -0.6;
/** Top-of-surface Y for the sunken water channel. */
export const WATER_Y = -0.34;

/** Terrace lift by distance (in rows) from the nearest home edge — 0 at the river band. */
const ROW_LIFT = [0.2, 0.13, 0.06, 0, 0];

/** Top surface height (world Y) a piece or tile-top rests at for this cell. */
export function surfaceY(pos: Position): number {
  if (WATER.some((w) => samePos(w, pos))) return WATER_Y;
  const fromEdge = Math.min(pos.row, BOARD_ROWS - 1 - pos.row);
  return ROW_LIFT[fromEdge] ?? 0;
}

/** Top of the wooden stilt planted in every water cell — what a swimmer actually stands on. */
export const WATER_POST_TOP = 0.1;

/**
 * Height a *piece* rests at. Same as the tile surface everywhere except water: the rat hops up
 * onto the stilt instead of sinking to the water plane ([WaterPosts](./WaterPosts.tsx)).
 */
export function pieceSurfaceY(pos: Position): number {
  return WATER.some((w) => samePos(w, pos)) ? WATER_POST_TOP : surfaceY(pos);
}
