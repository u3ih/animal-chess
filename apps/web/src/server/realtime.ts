import {
  applyMove,
  createInitialState,
  type GameState,
  isLegalMove,
  type Move,
  type Player
} from "@animal-chess/game-core";
import type {
  ChatMessage,
  ClientToServerEvents,
  FriendRequest,
  IdentityPayload,
  RoomInvite,
  RoomSnapshot,
  ServerToClientEvents
} from "@animal-chess/net-protocol";
import type { Server, Socket } from "socket.io";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type PlayerSlot = {
  socketId: string;
  userId: string;
  username: string;
  color: Player;
  connected: boolean;
};

type Room = {
  id: string;
  players: PlayerSlot[];
  state: GameState;
  rematch: Set<string>;
  timer: Record<Player, number>;
  turnStartedAt: number;
  chat: ChatMessage[];
};

/** Server-side presence record (carries socketId not exposed over the wire). */
type PresenceRecord = {
  userId: string;
  username: string;
  socketId: string;
  roomId?: string;
};

const rooms = new Map<string, Room>();
const queue: PlayerSlot[] = [];
const presence = new Map<string, PresenceRecord>();
const friendRequests = new Map<string, FriendRequest[]>();
const MOVE_SECONDS = 90;

function code(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function roomSnapshot(room: Room): RoomSnapshot {
  return {
    id: room.id,
    players: room.players.map(({ userId, username, color, connected }) => ({ userId, username, color, connected })),
    state: room.state,
    timer: room.timer,
    chat: room.chat
  };
}

function emitRoom(io: IO, room: Room) {
  io.to(room.id).emit("game:snapshot", roomSnapshot(room));
}

/** Per-second clock tick only — keeps the snapshot (and thus the board) referentially stable. */
function emitClock(io: IO, room: Room) {
  io.to(room.id).emit("game:clock", room.timer);
}

function joinRoom(socket: IOSocket, room: Room, player: PlayerSlot) {
  socket.join(room.id);
  room.players.push(player);
  socket.data.roomId = room.id;
  const entry = presence.get(player.userId);
  if (entry) {
    entry.roomId = room.id;
    presence.set(player.userId, entry);
  }
}

function createPlayer(socket: IOSocket, payload: IdentityPayload, color: Player): PlayerSlot {
  return {
    socketId: socket.id,
    userId: payload.userId,
    username: payload.username,
    color,
    connected: true
  };
}

function emitPresence(io: IO) {
  io.emit(
    "social:presence",
    [...presence.values()].map(({ userId, username, roomId }) => ({ userId, username, roomId }))
  );
}

export function registerRealtimeServer(io: IO) {
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.state.status.state !== "playing") continue;
      const now = Date.now();
      const elapsed = Math.floor((now - room.turnStartedAt) / 1000);
      if (elapsed <= 0) continue;
      room.timer[room.state.turn] = Math.max(0, room.timer[room.state.turn] - elapsed);
      room.turnStartedAt = now;
      if (room.timer[room.state.turn] === 0) {
        room.state = {
          ...room.state,
          status: { state: "won", winner: room.state.turn === "red" ? "blue" : "red", reason: "elimination" }
        };
        // State changed (game over) — push the full snapshot so the board updates.
        emitRoom(io, room);
      } else {
        // Normal tick: only the lightweight clock, so the board stays stable and does not re-render.
        emitClock(io, room);
      }
    }
  }, 1000);

  io.on("connection", (socket) => {
    socket.on("social:identify", (payload: { userId: string; username: string }) => {
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      presence.set(payload.userId, {
        userId: payload.userId,
        username: payload.username,
        socketId: socket.id,
        roomId: socket.data.roomId
      });
      socket.emit("social:requests", friendRequests.get(payload.username) ?? []);
      emitPresence(io);
    });

    socket.on("room:create", (payload: { userId: string; username: string }) => {
      const room: Room = {
        id: code(),
        players: [],
        state: createInitialState(),
        rematch: new Set(),
        timer: { red: MOVE_SECONDS, blue: MOVE_SECONDS },
        turnStartedAt: Date.now(),
        chat: []
      };
      rooms.set(room.id, room);
      joinRoom(socket, room, createPlayer(socket, payload, "red"));
      emitRoom(io, room);
    });

    socket.on("room:join", (payload: { roomId: string; userId: string; username: string }) => {
      const room = rooms.get(payload.roomId.toUpperCase());
      if (!room || room.players.length >= 2) {
        socket.emit("room:error", "Room unavailable");
        return;
      }
      joinRoom(socket, room, createPlayer(socket, payload, "blue"));
      emitRoom(io, room);
    });

    socket.on("matchmaking:join", (payload: { userId: string; username: string }) => {
      // Already waiting on this socket/user — ignore so we never match a player with themselves.
      if (queue.some((entry) => entry.socketId === socket.id || entry.userId === payload.userId)) {
        socket.emit("matchmaking:waiting");
        return;
      }
      // Pull the first opponent whose socket is still connected; drop stale queue entries.
      let waiting = queue.shift();
      while (waiting && !io.sockets.sockets.get(waiting.socketId)) {
        waiting = queue.shift();
      }
      if (!waiting) {
        queue.push(createPlayer(socket, payload, "red"));
        socket.emit("matchmaking:waiting");
        return;
      }
      const player = createPlayer(socket, payload, "blue");

      const room: Room = {
        id: code(),
        players: [waiting],
        state: createInitialState(),
        rematch: new Set(),
        timer: { red: MOVE_SECONDS, blue: MOVE_SECONDS },
        turnStartedAt: Date.now(),
        chat: []
      };
      rooms.set(room.id, room);
      const waitingSocket = io.sockets.sockets.get(waiting.socketId);
      waitingSocket?.join(room.id);
      joinRoom(socket, room, player);
      if (waitingSocket) waitingSocket.data.roomId = room.id;
      emitRoom(io, room);
    });

    socket.on("matchmaking:leave", () => {
      const index = queue.findIndex((player) => player.socketId === socket.id);
      if (index >= 0) queue.splice(index, 1);
    });

    socket.on("game:move", (payload: Pick<Move, "pieceId" | "to">) => {
      const room = rooms.get(socket.data.roomId);
      if (room?.state.status.state !== "playing") return;
      const player = room.players.find((entry) => entry.socketId === socket.id);
      if (!player || player.color !== room.state.turn || !isLegalMove(room.state, payload)) {
        socket.emit("game:rejected", payload);
        return;
      }
      room.state = applyMove(room.state, payload);
      // Per-move clock: the player now to move gets a fresh 90s.
      room.timer[room.state.turn] = MOVE_SECONDS;
      room.turnStartedAt = Date.now();
      emitRoom(io, room);
    });

    socket.on("game:rematch", () => {
      const room = rooms.get(socket.data.roomId);
      if (!room) return;
      room.rematch.add(socket.id);
      if (room.rematch.size === 2) {
        room.state = createInitialState();
        room.timer = { red: MOVE_SECONDS, blue: MOVE_SECONDS };
        room.turnStartedAt = Date.now();
        room.rematch.clear();
      }
      emitRoom(io, room);
    });

    socket.on("chat:send", (payload: { userId: string; username: string; text: string }) => {
      const room = rooms.get(socket.data.roomId);
      const text = payload.text.trim().slice(0, 240);
      if (!room || !text) return;
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        userId: payload.userId,
        username: payload.username.trim().slice(0, 24) || "Khách",
        text,
        createdAt: Date.now()
      };
      room.chat = [...room.chat.slice(-49), message];
      emitRoom(io, room);
    });

    socket.on("social:friend-request", (payload: { toUsername: string }) => {
      const fromUserId = socket.data.userId as string | undefined;
      const fromUsername = socket.data.username as string | undefined;
      if (!fromUserId || !fromUsername || !payload.toUsername || payload.toUsername === fromUsername) return;
      const request: FriendRequest = {
        id: crypto.randomUUID(),
        fromUserId,
        fromUsername,
        toUsername: payload.toUsername
      };
      const nextRequests = [...(friendRequests.get(payload.toUsername) ?? []), request];
      friendRequests.set(payload.toUsername, nextRequests);
      const target = [...presence.values()].find((entry) => entry.username === payload.toUsername);
      if (target) io.to(target.socketId).emit("social:requests", nextRequests);
    });

    socket.on("social:friend-accept", (payload: { requestId: string }) => {
      const username = socket.data.username as string | undefined;
      if (!username) return;
      const requests = friendRequests.get(username) ?? [];
      const request = requests.find((entry) => entry.id === payload.requestId);
      if (!request) return;
      friendRequests.set(
        username,
        requests.filter((entry) => entry.id !== payload.requestId)
      );
      socket.emit("social:friend-accepted", request.fromUsername);
      const requester = presence.get(request.fromUserId);
      if (requester) io.to(requester.socketId).emit("social:friend-accepted", username);
      socket.emit("social:requests", friendRequests.get(username) ?? []);
    });

    socket.on("social:invite", (payload: { toUsername: string }) => {
      const fromUserId = socket.data.userId as string | undefined;
      const fromUsername = socket.data.username as string | undefined;
      const roomId = socket.data.roomId as string | undefined;
      if (!fromUserId || !fromUsername || !roomId) return;
      const target = [...presence.values()].find((entry) => entry.username === payload.toUsername);
      if (!target) return;
      const invite: RoomInvite = {
        id: crypto.randomUUID(),
        fromUserId,
        fromUsername,
        roomId
      };
      io.to(target.socketId).emit("social:invite", invite);
    });

    socket.on("disconnect", () => {
      // Drop any matchmaking entry for this socket so we never pair against a ghost.
      const queued = queue.findIndex((entry) => entry.socketId === socket.id);
      if (queued >= 0) queue.splice(queued, 1);
      const room = rooms.get(socket.data.roomId);
      if (!room) return;
      const player = room.players.find((entry) => entry.socketId === socket.id);
      if (player) player.connected = false;
      emitRoom(io, room);
      if (socket.data.userId) presence.delete(socket.data.userId);
      emitPresence(io);
    });
  });
}
