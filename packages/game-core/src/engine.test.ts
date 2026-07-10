import { describe, expect, it } from "vitest";
import { allLegalMoves, applyMove, applyMoveUnchecked, createInitialState, legalMovesForPiece } from "./engine";
import type { GameState } from "./types";

function stateWithPieces(pieces: GameState["pieces"], turn: GameState["turn"] = "red"): GameState {
  return {
    turn,
    pieces,
    history: [],
    status: { state: "playing" }
  };
}

describe("game engine", () => {
  it("creates the classic opening setup", () => {
    const state = createInitialState();
    expect(state.pieces).toHaveLength(16);
    expect(state.turn).toBe("red");
  });

  it("lets rats enter water while land animals cannot", () => {
    const ratState = stateWithPieces([{ id: "red-rat", owner: "red", kind: "rat", position: { row: 3, col: 0 } }]);
    const catState = stateWithPieces([{ id: "red-cat", owner: "red", kind: "cat", position: { row: 3, col: 0 } }]);
    expect(legalMovesForPiece(ratState, "red-rat").some((move) => move.to.row === 3 && move.to.col === 1)).toBe(true);
    expect(legalMovesForPiece(catState, "red-cat").some((move) => move.to.row === 3 && move.to.col === 1)).toBe(false);
  });

  it("lets lions jump water unless a rat blocks the path", () => {
    const open = stateWithPieces([{ id: "red-lion", owner: "red", kind: "lion", position: { row: 3, col: 0 } }]);
    const blocked = stateWithPieces([
      { id: "red-lion", owner: "red", kind: "lion", position: { row: 3, col: 0 } },
      { id: "blue-rat", owner: "blue", kind: "rat", position: { row: 3, col: 1 } }
    ]);
    expect(legalMovesForPiece(open, "red-lion").some((move) => move.to.row === 3 && move.to.col === 3)).toBe(true);
    expect(legalMovesForPiece(blocked, "red-lion").some((move) => move.to.row === 3 && move.to.col === 3)).toBe(false);
  });

  it("lets rats capture elephants but not vice versa", () => {
    const ratAttack = stateWithPieces([
      { id: "red-rat", owner: "red", kind: "rat", position: { row: 6, col: 3 } },
      { id: "blue-elephant", owner: "blue", kind: "elephant", position: { row: 6, col: 4 } }
    ]);
    const elephantAttack = stateWithPieces([
      { id: "red-elephant", owner: "red", kind: "elephant", position: { row: 6, col: 3 } },
      { id: "blue-rat", owner: "blue", kind: "rat", position: { row: 6, col: 4 } }
    ]);
    expect(legalMovesForPiece(ratAttack, "red-rat").some((move) => move.to.col === 4)).toBe(true);
    expect(legalMovesForPiece(elephantAttack, "red-elephant").some((move) => move.to.col === 4)).toBe(false);
  });

  it("ends the game when a piece enters the enemy den", () => {
    const state = stateWithPieces([{ id: "red-rat", owner: "red", kind: "rat", position: { row: 1, col: 3 } }]);
    const next = applyMove(state, { pieceId: "red-rat", to: { row: 0, col: 3 } });
    expect(next.status).toEqual({ state: "won", winner: "red", reason: "den" });
  });

  it("applyMoveUnchecked matches applyMove (except history) for every opening move", () => {
    const state = createInitialState();
    for (const move of allLegalMoves(state)) {
      const checked = applyMove(state, move);
      const unchecked = applyMoveUnchecked(state, move);
      expect(unchecked.pieces).toEqual(checked.pieces);
      expect(unchecked.turn).toBe(checked.turn);
      expect(unchecked.status).toEqual(checked.status);
      expect(unchecked.lastMove).toEqual(checked.lastMove);
    }
  });

  it("applyMoveUnchecked resolves a capture identically to applyMove", () => {
    const state = stateWithPieces([
      { id: "red-rat", owner: "red", kind: "rat", position: { row: 6, col: 3 } },
      { id: "blue-elephant", owner: "blue", kind: "elephant", position: { row: 6, col: 4 } }
    ]);
    const move = legalMovesForPiece(state, "red-rat").find((candidate) => candidate.to.col === 4);
    expect(move).toBeDefined();
    if (!move) return;
    const checked = applyMove(state, move);
    const unchecked = applyMoveUnchecked(state, move);
    expect(unchecked.pieces).toEqual(checked.pieces);
    expect(unchecked.pieces.some((piece) => piece.id === "blue-elephant")).toBe(false);
    expect(unchecked.status).toEqual(checked.status);
  });
});
