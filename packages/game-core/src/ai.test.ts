import { describe, expect, it } from "vitest";
import { chooseAiMove, orderMoves } from "./ai";
import { createInitialState, isLegalMove } from "./engine";
import type { GameState, Move } from "./types";

describe("ai", () => {
  it("always returns a legal move", () => {
    const state = createInitialState();
    const move = chooseAiMove(state, "medium");
    expect(move).toBeDefined();
    expect(move && isLegalMove(state, move)).toBe(true);
  });

  it("orders captures first, most valuable victim first", () => {
    const quiet: Move = { pieceId: "red-lion", from: { row: 0, col: 0 }, to: { row: 1, col: 0 } };
    const capCat: Move = {
      pieceId: "red-lion",
      from: { row: 0, col: 0 },
      to: { row: 0, col: 1 },
      capturedPieceId: "blue-cat"
    };
    const capElephant: Move = {
      pieceId: "red-lion",
      from: { row: 0, col: 0 },
      to: { row: 1, col: 1 },
      capturedPieceId: "blue-elephant"
    };
    const ordered = orderMoves([quiet, capCat, capElephant]);
    expect(ordered[0].capturedPieceId).toBe("blue-elephant");
    expect(ordered[1].capturedPieceId).toBe("blue-cat");
    expect(ordered[2].capturedPieceId).toBeUndefined();
  });

  it("hard AI takes a winning den entry", () => {
    const state: GameState = {
      turn: "blue",
      pieces: [
        { id: "blue-rat", owner: "blue", kind: "rat", position: { row: 7, col: 3 } },
        { id: "red-lion", owner: "red", kind: "lion", position: { row: 0, col: 0 } }
      ],
      history: [],
      status: { state: "playing" }
    };
    const move = chooseAiMove(state, "hard", "blue");
    expect(move?.to).toEqual({ row: 8, col: 3 });
  });
});
