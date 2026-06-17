import type { PieceKind, Player, Position } from "./types";

export const BOARD_ROWS = 9;
export const BOARD_COLS = 7;

export const PIECE_RANK: Record<PieceKind, number> = {
  rat: 1,
  cat: 2,
  dog: 3,
  wolf: 4,
  leopard: 5,
  tiger: 6,
  lion: 7,
  elephant: 8
};

export const START_POSITIONS: Record<Player, Record<PieceKind, Position>> = {
  red: {
    lion: { row: 8, col: 0 },
    tiger: { row: 8, col: 6 },
    dog: { row: 7, col: 1 },
    cat: { row: 7, col: 5 },
    rat: { row: 6, col: 0 },
    leopard: { row: 6, col: 2 },
    wolf: { row: 6, col: 4 },
    elephant: { row: 6, col: 6 }
  },
  blue: {
    tiger: { row: 0, col: 0 },
    lion: { row: 0, col: 6 },
    cat: { row: 1, col: 1 },
    dog: { row: 1, col: 5 },
    elephant: { row: 2, col: 0 },
    wolf: { row: 2, col: 2 },
    leopard: { row: 2, col: 4 },
    rat: { row: 2, col: 6 }
  }
};

export const DENS: Record<Player, Position> = {
  blue: { row: 0, col: 3 },
  red: { row: 8, col: 3 }
};

export const TRAPS: Record<Player, Position[]> = {
  blue: [
    { row: 0, col: 2 },
    { row: 0, col: 4 },
    { row: 1, col: 3 }
  ],
  red: [
    { row: 8, col: 2 },
    { row: 8, col: 4 },
    { row: 7, col: 3 }
  ]
};

export const WATER: Position[] = [
  { row: 3, col: 1 },
  { row: 3, col: 2 },
  { row: 4, col: 1 },
  { row: 4, col: 2 },
  { row: 5, col: 1 },
  { row: 5, col: 2 },
  { row: 3, col: 4 },
  { row: 3, col: 5 },
  { row: 4, col: 4 },
  { row: 4, col: 5 },
  { row: 5, col: 4 },
  { row: 5, col: 5 }
];
