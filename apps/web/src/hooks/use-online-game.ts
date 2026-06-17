"use client";

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
import type { PlayerIdentity } from "./use-player-identity";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type { FriendRequest, PresenceEntry, RoomInvite } from "@animal-chess/net-protocol";

export function useOnlineGame(identity?: PlayerIdentity) {
  const socketRef = useRef<GameSocket | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<RoomSnapshot>();
  const [status, setStatus] = useState("Chưa kết nối");
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<string[]>([]);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [fallbackIdentity] = useState(() => ({
    userId: crypto.randomUUID(),
    username: `Khách ${Math.floor(Math.random() * 900 + 100)}`
  }));
  const player = identity ?? fallbackIdentity;

  useEffect(() => {
    const nextSocket: GameSocket = io();
    nextSocket.on("connect", () => setStatus("Đã kết nối"));
    nextSocket.on("matchmaking:waiting", () => setStatus("Đang chờ đối thủ"));
    nextSocket.on("game:snapshot", (payload: RoomSnapshot) => {
      setSnapshot(payload);
      setStatus(payload.players.length < 2 ? "Đang chờ người chơi" : "Đang trong trận");
    });
    nextSocket.on("room:error", () => setStatus("Không thể vào phòng"));
    nextSocket.on("game:rejected", () => setStatus("Nước đi bị từ chối"));
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
    status,
    localPlayer: snapshot?.players.find((entry) => entry.userId === player.userId),
    presence,
    friendRequests,
    acceptedFriends,
    invites,
    createRoom: () => socketRef.current?.emit("room:create", player),
    joinRoom: (roomId: string) => socketRef.current?.emit("room:join", { roomId, ...player }),
    quickMatch: () => socketRef.current?.emit("matchmaking:join", player),
    leaveMatchmaking: () => socketRef.current?.emit("matchmaking:leave"),
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
