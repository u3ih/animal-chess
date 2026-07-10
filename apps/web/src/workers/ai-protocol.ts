import type { AiLevel, GameState, Move, Player } from "@animal-chess/game-core";

/** Message the main thread sends to the AI worker. `id` correlates the reply. */
export type AiWorkerRequest = { id: number; state: GameState; level: AiLevel; player: Player };
/** Reply from the AI worker (`move: null` when there is no legal move). */
export type AiWorkerResponse = { id: number; move: Move | null };
