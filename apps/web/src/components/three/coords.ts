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
