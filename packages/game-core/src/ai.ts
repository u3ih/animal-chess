import { DENS, PIECE_RANK } from "./constants";
import { allLegalMoves, applyMove, otherPlayer } from "./engine";
import type { GameState, Move, Player } from "./types";

export type AiLevel = "easy" | "medium" | "hard";

const DEPTH_BY_LEVEL: Record<AiLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

function distanceToEnemyDen(state: GameState, player: Player): number {
  const target = DENS[otherPlayer(player)];
  const ownPieces = state.pieces.filter((piece) => piece.owner === player);
  if (ownPieces.length === 0) return 0;
  return Math.min(
    ...ownPieces.map((piece) => Math.abs(piece.position.row - target.row) + Math.abs(piece.position.col - target.col))
  );
}

function evaluate(state: GameState, perspective: Player): number {
  if (state.status.state === "won") {
    return state.status.winner === perspective ? 10_000 : -10_000;
  }

  const material = state.pieces.reduce((score, piece) => {
    const value = PIECE_RANK[piece.kind] * 10;
    return piece.owner === perspective ? score + value : score - value;
  }, 0);

  const denPressure = distanceToEnemyDen(state, otherPlayer(perspective)) - distanceToEnemyDen(state, perspective);
  return material + denPressure;
}

function minimax(state: GameState, depth: number, perspective: Player, alpha: number, beta: number): number {
  if (depth === 0 || state.status.state === "won") return evaluate(state, perspective);

  const maximizing = state.turn === perspective;
  const moves = allLegalMoves(state);
  if (moves.length === 0) return evaluate(state, perspective);

  if (maximizing) {
    let value = Number.NEGATIVE_INFINITY;
    for (const move of moves) {
      value = Math.max(value, minimax(applyMove(state, move), depth - 1, perspective, alpha, beta));
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  }

  let value = Number.POSITIVE_INFINITY;
  for (const move of moves) {
    value = Math.min(value, minimax(applyMove(state, move), depth - 1, perspective, alpha, beta));
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
}

export function chooseAiMove(state: GameState, level: AiLevel, player: Player = state.turn): Move | undefined {
  const moves = allLegalMoves(state, player);
  if (moves.length === 0) return undefined;

  if (level === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = DEPTH_BY_LEVEL[level];
  let bestMove = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of moves) {
    const score = minimax(
      applyMove({ ...state, turn: player }, move),
      depth - 1,
      player,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY
    );
    if (score > bestScore) {
      bestMove = move;
      bestScore = score;
    }
  }

  return bestMove;
}
