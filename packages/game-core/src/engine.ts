import { BOARD_COLS, BOARD_ROWS, DENS, PIECE_RANK, START_POSITIONS, TRAPS, WATER } from "./constants";
import type { GameState, Move, Piece, PieceKind, Player, Position } from "./types";

const DIRECTIONS = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 }
];

export function otherPlayer(player: Player): Player {
  return player === "red" ? "blue" : "red";
}

export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isInsideBoard(position: Position): boolean {
  return position.row >= 0 && position.row < BOARD_ROWS && position.col >= 0 && position.col < BOARD_COLS;
}

export function isWater(position: Position): boolean {
  return WATER.some((cell) => samePosition(cell, position));
}

export function isTrapOf(player: Player, position: Position): boolean {
  return TRAPS[player].some((cell) => samePosition(cell, position));
}

export function createInitialState(): GameState {
  const pieces: Piece[] = Object.entries(START_POSITIONS).flatMap(([owner, positions]) =>
    Object.entries(positions).map(([kind, position]) => ({
      id: `${owner}-${kind}`,
      owner: owner as Player,
      kind: kind as PieceKind,
      position
    }))
  );

  return {
    turn: "red",
    pieces,
    history: [],
    status: { state: "playing" }
  };
}

export function pieceAt(state: GameState, position: Position): Piece | undefined {
  return state.pieces.find((piece) => samePosition(piece.position, position));
}

function canEnterCell(piece: Piece, destination: Position): boolean {
  if (!isInsideBoard(destination)) return false;
  if (samePosition(destination, DENS[piece.owner])) return false;
  if (isWater(destination) && piece.kind !== "rat") return false;
  return true;
}

function isRatBlockingJump(state: GameState, from: Position, direction: Position): boolean {
  let cursor = { row: from.row + direction.row, col: from.col + direction.col };
  while (isWater(cursor)) {
    const blocker = pieceAt(state, cursor);
    if (blocker?.kind === "rat") return true;
    cursor = { row: cursor.row + direction.row, col: cursor.col + direction.col };
  }
  return false;
}

function jumpDestination(from: Position, direction: Position): Position {
  let cursor = { row: from.row + direction.row, col: from.col + direction.col };
  while (isWater(cursor)) {
    cursor = { row: cursor.row + direction.row, col: cursor.col + direction.col };
  }
  return cursor;
}

function canCapture(attacker: Piece, defender: Piece): boolean {
  if (attacker.owner === defender.owner) return false;
  if (isWater(attacker.position) !== isWater(defender.position)) return false;
  if (isTrapOf(attacker.owner, defender.position)) return true;
  if (attacker.kind === "rat" && defender.kind === "elephant") return true;
  if (attacker.kind === "elephant" && defender.kind === "rat") return false;
  return PIECE_RANK[attacker.kind] >= PIECE_RANK[defender.kind];
}

function candidateDestinations(state: GameState, piece: Piece): Position[] {
  return DIRECTIONS.flatMap((direction) => {
    const adjacent = {
      row: piece.position.row + direction.row,
      col: piece.position.col + direction.col
    };

    if ((piece.kind === "lion" || piece.kind === "tiger") && isWater(adjacent)) {
      if (isRatBlockingJump(state, piece.position, direction)) return [];
      return [jumpDestination(piece.position, direction)];
    }

    return [adjacent];
  });
}

export function legalMovesForPiece(state: GameState, pieceId: string): Move[] {
  if (state.status.state !== "playing") return [];
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || piece.owner !== state.turn) return [];

  return candidateDestinations(state, piece)
    .filter((destination) => canEnterCell(piece, destination))
    .flatMap((destination) => {
      const occupant = pieceAt(state, destination);
      if (!occupant) {
        return [
          {
            pieceId: piece.id,
            from: piece.position,
            to: destination
          }
        ];
      }

      if (!canCapture(piece, occupant)) return [];

      return [
        {
          pieceId: piece.id,
          from: piece.position,
          to: destination,
          capturedPieceId: occupant.id
        }
      ];
    });
}

export function allLegalMoves(state: GameState, player: Player = state.turn): Move[] {
  if (player !== state.turn) {
    return allLegalMoves({ ...state, turn: player }, player);
  }

  return state.pieces.filter((piece) => piece.owner === player).flatMap((piece) => legalMovesForPiece(state, piece.id));
}

export function isLegalMove(state: GameState, move: Pick<Move, "pieceId" | "to">): boolean {
  return legalMovesForPiece(state, move.pieceId).some((candidate) => samePosition(candidate.to, move.to));
}

/**
 * Apply a move already known to be legal for `state`, WITHOUT re-deriving legality and WITHOUT
 * growing `history`. `move` must be a Move produced by `legalMovesForPiece`/`allLegalMoves` for this
 * exact state (the AI search reuses those results). Search nodes are ephemeral and never read their
 * own history, so skipping the array copy is a big allocation win multiplied across thousands of
 * nodes. For all UI/server callers use `applyMove`, which validates and records history.
 */
export function applyMoveUnchecked(state: GameState, move: Move): GameState {
  const pieces = state.pieces
    .filter((piece) => piece.id !== move.capturedPieceId)
    .map((piece) => (piece.id === move.pieceId ? { ...piece, position: move.to } : piece));

  const movingPiece = pieces.find((piece) => piece.id === move.pieceId);
  const opponent = otherPlayer(state.turn);
  const opponentPieces = pieces.filter((piece) => piece.owner === opponent);
  const enteredOpponentDen = movingPiece ? samePosition(movingPiece.position, DENS[opponent]) : false;
  const status = enteredOpponentDen
    ? ({ state: "won", winner: state.turn, reason: "den" } as const)
    : opponentPieces.length === 0
      ? ({ state: "won", winner: state.turn, reason: "elimination" } as const)
      : ({ state: "playing" } as const);

  return {
    turn: status.state === "playing" ? opponent : state.turn,
    pieces,
    history: state.history,
    lastMove: move,
    status
  };
}

export function applyMove(state: GameState, move: Pick<Move, "pieceId" | "to">): GameState {
  const legalMove = legalMovesForPiece(state, move.pieceId).find((candidate) => samePosition(candidate.to, move.to));
  if (!legalMove) throw new Error("Illegal move");
  const next = applyMoveUnchecked(state, legalMove);
  return { ...next, history: [...state.history, legalMove] };
}
