"use client";

import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, Input, Panel } from "@animal-chess/ui";
import { Link2, RadioTower, RefreshCcw, Swords, X } from "lucide-react";
import { type FormEvent, useState } from "react";

export function OnlinePanel({
  active,
  onActivate,
  roomId,
  status,
  waiting,
  winner,
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  onCancelMatch,
  onRematch
}: {
  active: boolean;
  onActivate: () => void;
  roomId?: string;
  status: string;
  waiting?: boolean;
  winner?: string;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onQuickMatch: () => void;
  onCancelMatch: () => void;
  onRematch: () => void;
}) {
  const { t } = useTranslation();
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
    <Panel as="div" className={cx("online-panel", active && "active")} icon={<RadioTower />} title={t("online.title")}>
      <p>{status}</p>
      {roomId ? <strong>{t("online.roomCode", { id: roomId })}</strong> : null}
      <div className="panel-actions">
        <Button onClick={createRoom} icon={<Link2 />}>
          {t("online.createRoom")}
        </Button>
        {waiting ? (
          <Button onClick={onCancelMatch} icon={<X />}>
            {t("online.cancelMatch")}
          </Button>
        ) : (
          <Button onClick={quickMatch} icon={<Swords />}>
            {t("online.quickMatch")}
          </Button>
        )}
      </div>
      <form onSubmit={joinRoom}>
        <Input
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder={t("online.roomCodePlaceholder")}
        />
        <Button type="submit" icon={<RefreshCcw />} />
      </form>
      {winner ? <Button onClick={onRematch}>{t("online.rematch")}</Button> : null}
    </Panel>
  );
}
