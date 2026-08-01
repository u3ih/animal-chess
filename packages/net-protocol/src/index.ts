import type { GameState, Move, Player } from "@animal-chess/game-core";

/**
 * Socket.IO contract for the **Node game server** only.
 *
 * Social/presence/friends/invites/rank/gamification moved to the Python GraphQL backend
 * (see `@animal-chess/social-protocol`). This contract is now strictly about live games.
 */

/** Move payload exchanged over the wire (full Move is derived server-side). */
export type MovePayload = Pick<Move, "pieceId" | "to">;

/** Player identity attached to most client requests. */
export type IdentityPayload = {
  userId: string;
  username: string;
  /** Optional avatar URL (Google profile photo); guests have none. */
  avatar?: string;
};

export type RoomVisibility = "public" | "private";

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: number;
};

export type RoomPlayer = {
  userId: string;
  username: string;
  color: Player;
  connected: boolean;
  /** Avatar URL (Google profile photo); undefined for guests. */
  avatar?: string;
  /** Lobby readiness. Host (players[0]) starts the game and is implicitly ready. */
  ready: boolean;
};

/** A room is in `lobby` (waiting + ready-up) until the host starts, then `playing`. */
export type RoomPhase = "lobby" | "playing";

export type RoomSnapshot = {
  id: string;
  phase: RoomPhase;
  players: RoomPlayer[];
  /** `state.history` is truncated to `[]` on the wire — clients must not rely on it. */
  state: GameState;
  timer: Record<Player, number>;
  chat: ChatMessage[];
};

/** Events the client emits and the server listens for. */
export type ClientToServerEvents = {
  "room:create": (payload: IdentityPayload & { visibility?: RoomVisibility }) => void;
  "room:join": (payload: IdentityPayload & { roomId: string }) => void;
  /** Non-host toggles their lobby readiness. */
  "room:ready": () => void;
  /** Host starts the match once the opponent is ready. */
  "room:start": () => void;
  /** Leave the current room and return to the lobby browser. */
  "room:leave": () => void;
  "matchmaking:join": (payload: IdentityPayload) => void;
  "matchmaking:leave": () => void;
  "game:move": (payload: MovePayload) => void;
  "game:rematch": () => void;
  "chat:send": (payload: IdentityPayload & { text: string }) => void;
};

/** Events the server emits and the client listens for. */
export type ServerToClientEvents = {
  "game:snapshot": (snapshot: RoomSnapshot) => void;
  /** Lightweight per-second clock tick — sent every second instead of a full snapshot, so the
   *  game state object stays referentially stable and the board does not re-render each tick. */
  "game:clock": (timer: Record<Player, number>) => void;
  "matchmaking:waiting": () => void;
  "room:error": (message: string) => void;
  "game:rejected": (payload: MovePayload) => void;
};
