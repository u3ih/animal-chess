import {
  applyMove,
  createInitialState,
  type GameState,
  isLegalMove,
  type Move,
  type Player,
  pieceAt
} from "@animal-chess/game-core";
import type {
  ChatMessage,
  ClientToServerEvents,
  IdentityPayload,
  RoomSnapshot,
  RoomVisibility,
  ServerToClientEvents
} from "@animal-chess/net-protocol";
import type { Server, Socket } from "socket.io";
import * as sync from "./python-sync";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type PlayerSlot = {
  socketId: string;
  userId: string;
  username: string;
  color: Player;
  connected: boolean;
  avatar?: string;
  ready: boolean;
};

type Room = {
  id: string;
  /** `lobby` = waiting + ready-up; `playing` = match running. */
  phase: "lobby" | "playing";
  players: PlayerSlot[];
  state: GameState;
  rematch: Set<string>;
  timer: Record<Player, number>;
  turnStartedAt: number;
  chat: ChatMessage[];
  visibility: RoomVisibility;
  createdAt: number;
  /** When the current game started (2 players present). */
  startedAt: number;
  /** Distinguishes successive games in the same room (rematch) for match-result idempotency. */
  gameSeq: number;
  moves: number;
  captured: Record<Player, string[]>;
  /** Guards against double-reporting a finished game (move-win vs clock-timeout). */
  reported: boolean;
  listed: boolean;
};

const rooms = new Map<string, Room>();
const queue: PlayerSlot[] = [];
const MOVE_SECONDS = 90;

function code(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function newGameState(room: Room): void {
  room.state = createInitialState();
  room.timer = { red: MOVE_SECONDS, blue: MOVE_SECONDS };
  room.turnStartedAt = Date.now();
  room.startedAt = Date.now();
  room.moves = 0;
  room.captured = { red: [], blue: [] };
  room.reported = false;
}

function createRoom(id: string, visibility: RoomVisibility): Room {
  const room: Room = {
    id,
    phase: "lobby",
    players: [],
    state: createInitialState(),
    rematch: new Set(),
    timer: { red: MOVE_SECONDS, blue: MOVE_SECONDS },
    turnStartedAt: Date.now(),
    chat: [],
    visibility,
    createdAt: Date.now(),
    startedAt: Date.now(),
    gameSeq: 0,
    moves: 0,
    captured: { red: [], blue: [] },
    reported: false,
    listed: false
  };
  return room;
}

function roomSnapshot(room: Room): RoomSnapshot {
  return {
    id: room.id,
    phase: room.phase,
    players: room.players.map(({ userId, username, color, connected, avatar, ready }) => ({
      userId,
      username,
      color,
      connected,
      avatar,
      ready
    })),
    // history grows O(moves) and no client reads it in the board path, so trim it off the wire.
    // The server keeps the full history in `room.state` for its own move validation.
    state: { ...room.state, history: [] },
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
}

function createPlayer(socket: IOSocket, payload: IdentityPayload, color: Player): PlayerSlot {
  return {
    socketId: socket.id,
    userId: payload.userId,
    username: payload.username,
    color,
    connected: true,
    avatar: payload.avatar,
    ready: false
  };
}

/** Report a finished game to the Python backend exactly once (drives ELO/rewards/quests). */
function finishGame(room: Room, reason: "den" | "elimination" | "timeout" | "resign") {
  if (room.reported || room.players.length < 2) return;
  room.reported = true;
  const winner = room.state.status.state === "won" ? room.state.status.winner : null;
  sync.reportMatchResult({
    matchId: `${room.id}:${room.gameSeq}`,
    players: room.players.map((p) => ({ userId: p.userId, color: p.color })),
    winner,
    reason,
    moves: room.moves,
    startedAt: new Date(room.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    capturedKinds: room.captured
  });
}

function lobbyVisible(room: Room): boolean {
  return room.visibility === "public" && room.players.length < 2 && room.state.status.state === "playing";
}

/** Open public rooms — Python calls this on startup to rebuild its lobby cache. */
export function roomsSnapshot() {
  return {
    rooms: [...rooms.values()].filter(lobbyVisible).map((room) => ({
      code: room.id,
      hostId: room.players[0]?.userId ?? "",
      hostName: room.players[0]?.username ?? "",
      hostTier: null,
      occupancy: room.players.length,
      visibility: room.visibility,
      createdAt: new Date(room.createdAt).toISOString()
    }))
  };
}

export function registerRealtimeServer(io: IO) {
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.phase !== "playing" || room.state.status.state !== "playing") continue;
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
        finishGame(room, "timeout");
        emitRoom(io, room);
      } else {
        emitClock(io, room);
      }
    }
  }, 1000);

  io.on("connection", (socket) => {
    socket.on("room:create", (payload) => {
      const visibility: RoomVisibility = payload.visibility ?? "public";
      const room = createRoom(code(), visibility);
      rooms.set(room.id, room);
      joinRoom(socket, room, createPlayer(socket, payload, "red"));
      if (visibility === "public") {
        room.listed = true;
        sync.registerRoom({ code: room.id, hostId: payload.userId, hostName: payload.username, visibility });
      }
      emitRoom(io, room);
    });

    socket.on("room:join", (payload) => {
      const room = rooms.get(payload.roomId.toUpperCase());
      if (room?.phase !== "lobby" || room.players.length >= 2) {
        socket.emit("room:error", "Room unavailable");
        return;
      }
      // Game no longer auto-starts on join; the host starts it once the opponent is ready.
      joinRoom(socket, room, createPlayer(socket, payload, "blue"));
      if (room.listed) sync.updateRoom(room.id, room.players.length);
      emitRoom(io, room);
    });

    socket.on("room:ready", () => {
      const room = rooms.get(socket.data.roomId);
      if (room?.phase !== "lobby") return;
      const player = room.players.find((entry) => entry.socketId === socket.id);
      // Host (players[0]) has no ready toggle — they hold the Start button instead.
      if (!player || player.socketId === room.players[0]?.socketId) return;
      player.ready = !player.ready;
      emitRoom(io, room);
    });

    socket.on("room:start", () => {
      const room = rooms.get(socket.data.roomId);
      if (room?.phase !== "lobby") return;
      const host = room.players[0];
      const opponent = room.players[1];
      // Only the host may start, and only once a connected opponent is ready.
      if (host?.socketId !== socket.id || !opponent?.connected || !opponent.ready) return;
      room.phase = "playing";
      room.gameSeq += 1;
      newGameState(room);
      emitRoom(io, room);
    });

    socket.on("room:leave", () => {
      const room = rooms.get(socket.data.roomId);
      if (!room) return;
      socket.leave(room.id);
      socket.data.roomId = undefined;
      room.players = room.players.filter((entry) => entry.socketId !== socket.id);
      if (room.players.length === 0) {
        if (room.listed) sync.closeRoom(room.id);
        rooms.delete(room.id);
        return;
      }
      // A teammate is still here: reset readiness and fall back to the lobby phase.
      room.phase = "lobby";
      for (const entry of room.players) entry.ready = false;
      if (room.listed) sync.updateRoom(room.id, room.players.length);
      emitRoom(io, room);
    });

    socket.on("matchmaking:join", (payload) => {
      if (queue.some((entry) => entry.socketId === socket.id || entry.userId === payload.userId)) {
        socket.emit("matchmaking:waiting");
        return;
      }
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
      const room = createRoom(code(), "private"); // matchmaking rooms are never listed in the lobby
      // The queued player is the host; both land in the ready room (no auto-start).
      room.players = [waiting];
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
      // `createInitialState().status` is already "playing" during the lobby, so gate on phase too.
      if (room?.phase !== "playing" || room.state.status.state !== "playing") return;
      const player = room.players.find((entry) => entry.socketId === socket.id);
      if (!player || player.color !== room.state.turn || !isLegalMove(room.state, payload)) {
        socket.emit("game:rejected", payload);
        return;
      }
      // Record a capture (target square holds an enemy piece) for capture quests/achievements.
      const target = pieceAt(room.state, payload.to);
      if (target && target.owner !== player.color) {
        room.captured[player.color].push(target.kind);
      }
      room.state = applyMove(room.state, payload);
      room.moves += 1;
      room.timer[room.state.turn] = MOVE_SECONDS;
      room.turnStartedAt = Date.now();
      if (room.state.status.state === "won") {
        finishGame(room, room.state.status.reason);
      }
      emitRoom(io, room);
    });

    socket.on("game:rematch", () => {
      const room = rooms.get(socket.data.roomId);
      if (!room) return;
      room.rematch.add(socket.id);
      if (room.rematch.size === 2) {
        room.gameSeq += 1;
        newGameState(room);
        room.rematch.clear();
      }
      emitRoom(io, room);
    });

    socket.on("chat:send", (payload) => {
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

    socket.on("disconnect", () => {
      const queued = queue.findIndex((entry) => entry.socketId === socket.id);
      if (queued >= 0) queue.splice(queued, 1);
      const room = rooms.get(socket.data.roomId);
      if (!room) return;
      const player = room.players.find((entry) => entry.socketId === socket.id);
      if (player) player.connected = false;
      emitRoom(io, room);

      // If everyone has dropped, retire the room (and its lobby entry).
      if (room.players.every((entry) => !entry.connected)) {
        if (room.listed) sync.closeRoom(room.id);
        rooms.delete(room.id);
      } else if (room.listed) {
        sync.updateRoom(room.id, room.players.filter((entry) => entry.connected).length);
      }
    });
  });
}
