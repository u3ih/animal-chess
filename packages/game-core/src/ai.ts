import { DENS, PIECE_RANK } from "./constants";
import { allLegalMoves, applyMoveUnchecked, otherPlayer } from "./engine";
import type { GameState, Move, PieceKind, Player } from "./types";

export type AiLevel = "easy" | "medium" | "hard";

const DEPTH_BY_LEVEL: Record<AiLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

/** Value of a move's captured victim (−1 for a quiet move), used to order the search. */
function victimValue(move: Move): number {
  if (!move.capturedPieceId) return -1;
  const kind = move.capturedPieceId.split("-")[1] as PieceKind;
  return PIECE_RANK[kind] ?? 0;
}

/**
 * Order moves so alpha-beta prunes sooner: captures first, most valuable victim first. Stable sort
 * (spread copy) keeps the original relative order among equal-value moves.
 */
export function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => victimValue(b) - victimValue(a));
}

function distanceToEnemyDen(state: GameState, player: Player): number {
  const target = DENS[otherPlayer(player)];
  let best = Number.POSITIVE_INFINITY;
  for (const piece of state.pieces) {
    if (piece.owner !== player) continue;
    const d = Math.abs(piece.position.row - target.row) + Math.abs(piece.position.col - target.col);
    if (d < best) best = d;
  }
  return best === Number.POSITIVE_INFINITY ? 0 : best;
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
  const moves = orderMoves(allLegalMoves(state));
  if (moves.length === 0) return evaluate(state, perspective);

  if (maximizing) {
    let value = Number.NEGATIVE_INFINITY;
    for (const move of moves) {
      value = Math.max(value, minimax(applyMoveUnchecked(state, move), depth - 1, perspective, alpha, beta));
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  }

  let value = Number.POSITIVE_INFINITY;
  for (const move of moves) {
    value = Math.min(value, minimax(applyMoveUnchecked(state, move), depth - 1, perspective, alpha, beta));
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
}

export function chooseAiMove(state: GameState, level: AiLevel, player: Player = state.turn): Move | undefined {
  const rawMoves = allLegalMoves(state, player);
  if (rawMoves.length === 0) return undefined;

  if (level === "easy") {
    return rawMoves[Math.floor(Math.random() * rawMoves.length)];
  }

  const depth = DEPTH_BY_LEVEL[level];
  const moves = orderMoves(rawMoves);
  const root = { ...state, turn: player };
  let bestMove = moves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of moves) {
    const score = minimax(
      applyMoveUnchecked(root, move),
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
