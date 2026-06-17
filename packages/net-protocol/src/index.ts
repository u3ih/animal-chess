import type { GameState, Move, Player } from "@animal-chess/game-core";

/** Move payload exchanged over the wire (full Move is derived server-side). */
export type MovePayload = Pick<Move, "pieceId" | "to">;

/** Player identity attached to most client requests. */
export type IdentityPayload = {
  userId: string;
  username: string;
};

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
};

export type RoomSnapshot = {
  id: string;
  players: RoomPlayer[];
  state: GameState;
  timer: Record<Player, number>;
  chat: ChatMessage[];
};

export type PresenceEntry = {
  userId: string;
  username: string;
  roomId?: string;
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUsername: string;
};

export type RoomInvite = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  roomId: string;
};

/** Events the client emits and the server listens for. */
export type ClientToServerEvents = {
  "social:identify": (payload: IdentityPayload) => void;
  "room:create": (payload: IdentityPayload) => void;
  "room:join": (payload: IdentityPayload & { roomId: string }) => void;
  "matchmaking:join": (payload: IdentityPayload) => void;
  "matchmaking:leave": () => void;
  "game:move": (payload: MovePayload) => void;
  "game:rematch": () => void;
  "chat:send": (payload: IdentityPayload & { text: string }) => void;
  "social:friend-request": (payload: { toUsername: string }) => void;
  "social:friend-accept": (payload: { requestId: string }) => void;
  "social:invite": (payload: { toUsername: string }) => void;
};

/** Events the server emits and the client listens for. */
export type ServerToClientEvents = {
  "game:snapshot": (snapshot: RoomSnapshot) => void;
  "matchmaking:waiting": () => void;
  "room:error": (message: string) => void;
  "game:rejected": (payload: MovePayload) => void;
  "social:presence": (presence: PresenceEntry[]) => void;
  "social:requests": (requests: FriendRequest[]) => void;
  "social:friend-accepted": (username: string) => void;
  "social:invite": (invite: RoomInvite) => void;
};
