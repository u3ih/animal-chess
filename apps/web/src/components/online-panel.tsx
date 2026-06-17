"use client";

import { Link2, RadioTower, RefreshCcw, Swords } from "lucide-react";
import { type FormEvent, useState } from "react";

export function OnlinePanel({
  active,
  onActivate,
  roomId,
  status,
  winner,
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  onRematch
}: {
  active: boolean;
  onActivate: () => void;
  roomId?: string;
  status: string;
  winner?: string;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onQuickMatch: () => void;
  onRematch: () => void;
}) {
  const [roomCode, setRoomCode] = useState("");

  function createRoom() {
    onActivate();
    onCreateRoom();
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    onActivate();
    onJoinRoom(roomCode);
  }

  function quickMatch() {
    onActivate();
    onQuickMatch();
  }

  return (
    <div className={`online-panel${active ? " active" : ""}`}>
      <div className="panel-title">
        <RadioTower />
        Online
      </div>
      <p>{status}</p>
      {roomId ? <strong>Mã phòng: {roomId}</strong> : null}
      <div className="panel-actions">
        <button onClick={createRoom}>
          <Link2 />
          Tạo phòng
        </button>
        <button onClick={quickMatch}>
          <Swords />
          Ghép nhanh
        </button>
      </div>
      <form onSubmit={joinRoom}>
        <input
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder="Nhập mã phòng"
        />
        <button type="submit">
          <RefreshCcw />
        </button>
      </form>
      {winner ? <button onClick={onRematch}>Rematch</button> : null}
    </div>
  );
}
