import { chooseAiMove } from "@animal-chess/game-core";
import type { AiWorkerRequest, AiWorkerResponse } from "./ai-protocol";

// Cast around the DOM/webworker lib overlap: in the app tsconfig `self` is typed as `Window`, so we
// pin the two members we actually use. GameState is plain JSON, so structured clone is trivial.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<AiWorkerRequest>) => void) | null;
  postMessage: (message: AiWorkerResponse) => void;
};

ctx.onmessage = (event) => {
  const { id, state, level, player } = event.data;
  const move = chooseAiMove(state, level, player) ?? null;
  ctx.postMessage({ id, move });
};
