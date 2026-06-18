"use client";

import type { Player } from "@animal-chess/game-core";
import type {
  ClientToServerEvents,
  FriendRequest,
  MovePayload,
  PresenceEntry,
  RoomInvite,
  RoomSnapshot,
  ServerToClientEvents
} from "@animal-chess/net-protocol";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
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

export type { FriendRequest, PresenceEntry, RoomInvite } from "@animal-chess/net-protocol";

export function useOnlineGame(identity?: PlayerIdentity) {
  const socketRef = useRef<GameSocket | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<RoomSnapshot>();
  // Clock is kept out of `snapshot` so per-second ticks don't replace the game-state object
  // (which would re-render the whole board/3D scene every second).
  const [timer, setTimer] = useState<Record<Player, number>>({ red: 0, blue: 0 });
  const [status, setStatus] = useState<OnlineStatusKey>("onlineStatus.disconnected");
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<string[]>([]);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [fallbackIdentity] = useState(() => ({
    userId: safeRandomUUID(),
    username: `Khách ${Math.floor(Math.random() * 900 + 100)}`
  }));
  const player = identity ?? fallbackIdentity;

  useEffect(() => {
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
    nextSocket.on("social:presence", setPresence);
    nextSocket.on("social:requests", setFriendRequests);
    nextSocket.on("social:friend-accepted", (username: string) =>
      setAcceptedFriends((current) => (current.includes(username) ? current : [...current, username]))
    );
    nextSocket.on("social:invite", (invite: RoomInvite) => setInvites((current) => [...current, invite]));
    socketRef.current = nextSocket;
    return () => {
      nextSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !identity) return;
    socketRef.current.emit("social:identify", identity);
  }, [identity]);

  return {
    snapshot,
    timer,
    status,
    localPlayer: snapshot?.players.find((entry) => entry.userId === player.userId),
    presence,
    friendRequests,
    acceptedFriends,
    invites,
    createRoom: () => socketRef.current?.emit("room:create", player),
    joinRoom: (roomId: string) => socketRef.current?.emit("room:join", { roomId, ...player }),
    quickMatch: () => socketRef.current?.emit("matchmaking:join", player),
    cancelMatch: () => {
      socketRef.current?.emit("matchmaking:leave");
      setStatus("onlineStatus.connected");
    },
    submitMove: (move: MovePayload) => socketRef.current?.emit("game:move", move),
    rematch: () => socketRef.current?.emit("game:rematch"),
    sendChat: (text: string) => socketRef.current?.emit("chat:send", { ...player, text }),
    sendFriendRequest: (toUsername: string) => socketRef.current?.emit("social:friend-request", { toUsername }),
    acceptFriendRequest: (requestId: string) => socketRef.current?.emit("social:friend-accept", { requestId }),
    inviteToRoom: (toUsername: string) => socketRef.current?.emit("social:invite", { toUsername }),
    acceptInvite: (invite: RoomInvite) => socketRef.current?.emit("room:join", { roomId: invite.roomId, ...player }),
    dismissInvite: (inviteId: string) => setInvites((current) => current.filter((invite) => invite.id !== inviteId))
  };
}
