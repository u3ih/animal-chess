"use client";

import type { Player } from "@animal-chess/game-core";
import type {
  ClientToServerEvents,
  MovePayload,
  RoomSnapshot,
  RoomVisibility,
  ServerToClientEvents
} from "@animal-chess/net-protocol";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { STATIC_EXPORT } from "../lib/flags";
import { safeRandomUUID } from "../lib/uuid";
import type { PlayerIdentity } from "./use-player-identity";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** i18n keys (under `onlineStatus.*`) — translated by the consumer so the hook stays framework-light. */
export type OnlineStatusKey =
  | "onlineStatus.disconnected"
  | "onlineStatus.connected"
  | "onlineStatus.waiting"
  | "onlineStatus.waitingPlayer"
  | "onlineStatus.inMatch"
  | "onlineStatus.roomError"
  | "onlineStatus.moveRejected";

/**
 * The live-game socket (Node server only): rooms, matchmaking, moves, clock, in-room chat.
 * Social/presence/friends/rank/gamification live in `useSocial` (Python GraphQL).
 */
export function useOnlineGame(identity?: PlayerIdentity) {
  const socketRef = useRef<GameSocket | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<RoomSnapshot>();
  // Clock is kept out of `snapshot` so per-second ticks don't replace the game-state object
  // (which would re-render the whole board/3D scene every second).
  const [timer, setTimer] = useState<Record<Player, number>>({ red: 0, blue: 0 });
  const [status, setStatus] = useState<OnlineStatusKey>("onlineStatus.disconnected");
  const [fallbackIdentity] = useState(() => ({
    userId: safeRandomUUID(),
    username: `Khách ${Math.floor(Math.random() * 900 + 100)}`
  }));
  const player = identity ?? fallbackIdentity;

  useEffect(() => {
    // Static GitHub Pages build has no Socket.IO server — never dial it.
    if (STATIC_EXPORT) return;
    const nextSocket: GameSocket = io();
    nextSocket.on("connect", () => setStatus("onlineStatus.connected"));
    nextSocket.on("matchmaking:waiting", () => setStatus("onlineStatus.waiting"));
    nextSocket.on("game:snapshot", (payload: RoomSnapshot) => {
      setSnapshot(payload);
      setTimer(payload.timer);
      setStatus(payload.players.length < 2 ? "onlineStatus.waitingPlayer" : "onlineStatus.inMatch");
    });
    nextSocket.on("game:clock", setTimer);
    nextSocket.on("room:error", () => setStatus("onlineStatus.roomError"));
    nextSocket.on("game:rejected", () => setStatus("onlineStatus.moveRejected"));
    socketRef.current = nextSocket;
    return () => {
      nextSocket.disconnect();
    };
  }, []);

  return {
    snapshot,
    timer,
    status,
    phase: snapshot?.phase,
    localPlayer: snapshot?.players.find((entry) => entry.userId === player.userId),
    /** Host = the first slot (room creator / queued player). Only the host can start. */
    isHost: snapshot?.players[0]?.userId === player.userId,
    createRoom: (visibility: RoomVisibility = "public") =>
      socketRef.current?.emit("room:create", { ...player, visibility }),
    joinRoom: (roomId: string) => socketRef.current?.emit("room:join", { roomId, ...player }),
    quickMatch: () => socketRef.current?.emit("matchmaking:join", player),
    cancelMatch: () => {
      socketRef.current?.emit("matchmaking:leave");
      setStatus("onlineStatus.connected");
    },
    toggleReady: () => socketRef.current?.emit("room:ready"),
    startMatch: () => socketRef.current?.emit("room:start"),
    leaveRoom: () => {
      socketRef.current?.emit("room:leave");
      setSnapshot(undefined);
      setStatus("onlineStatus.connected");
    },
    submitMove: (move: MovePayload) => socketRef.current?.emit("game:move", move),
    rematch: () => socketRef.current?.emit("game:rematch"),
    sendChat: (text: string) => socketRef.current?.emit("chat:send", { ...player, text })
  };
}
