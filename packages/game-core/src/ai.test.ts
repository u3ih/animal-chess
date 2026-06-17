import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { createInitialState, isLegalMove } from "./engine";

describe("ai", () => {
  it("always returns a legal move", () => {
    const state = createInitialState();
    const move = chooseAiMove(state, "medium");
    expect(move).toBeDefined();
    expect(move && isLegalMove(state, move)).toBe(true);
  });
});
