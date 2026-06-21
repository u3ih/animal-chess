"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { RoomSnapshot } from "@animal-chess/net-protocol";
import type { LobbyRoom } from "@animal-chess/social-protocol";
import { Button, cx, IconButton, Input } from "@animal-chess/ui";
import { ArrowLeft, Link2, LogIn, RefreshCcw, Swords, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RoomWaiting } from "@/components/room-waiting";
import { TIER_LABEL_KEY } from "@/lib/labels";
import styles from "./LobbyScreen.module.scss";

type LobbyOnline = {
  snapshot?: RoomSnapshot;
  phase?: "lobby" | "playing";
  status: string;
  isHost: boolean;
  localPlayer?: { userId: string };
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  quickMatch: () => void;
  cancelMatch: () => void;
  toggleReady: () => void;
  startMatch: () => void;
  leaveRoom: () => void;
};

/**
 * The online lobby screen. Two states: the room browser (create / quick-match / join-by-code +
 * open-room list) and, once you are in an unstarted room, the ready room (`RoomWaiting`).
 */
export function LobbyScreen({
  online,
  lobby,
  statusLabel,
  onRefresh,
  onBack
}: {
  online: LobbyOnline;
  lobby: LobbyRoom[];
  statusLabel: string;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [roomCode, setRoomCode] = useState("");
  const waiting = online.status === "onlineStatus.waiting";

  function joinByCode(event: FormEvent) {
    event.preventDefault();
    const code = roomCode.trim();
    if (code) online.joinRoom(code.toUpperCase());
  }

  // In a room that has not started yet → the ready room.
  if (online.snapshot && online.phase === "lobby") {
    return (
      <main className="menu-screen lobby-screen">
        <div className="menu-card room-card">
          <div className="menu-toolbar">
            <LanguageSwitcher className="menu-lang" />
          </div>
          <h1 className="menu-title">{t("room.title")}</h1>
          <RoomWaiting
            snapshot={online.snapshot}
            isHost={online.isHost}
            meId={online.localPlayer?.userId}
            onToggleReady={online.toggleReady}
            onStart={online.startMatch}
            onLeave={online.leaveRoom}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="menu-screen lobby-screen">
      <div className={cx("menu-card", styles.lobbyCard)}>
        <div className="menu-toolbar">
          <IconButton className="lobby-back" label={t("lobby.back")} icon={<ArrowLeft />} onClick={onBack} />
          <LanguageSwitcher className="menu-lang" />
        </div>
        <h1 className="menu-title">{t("lobby.heading")}</h1>
        <p className="menu-sub">{statusLabel}</p>

        <div className="mt-2 mb-3 grid grid-cols-2 gap-2.5">
          <Button className="min-h-[46px]" variant="primary" onClick={() => online.createRoom()} icon={<Link2 />}>
            {t("online.createRoom")}
          </Button>
          {waiting ? (
            <Button className="min-h-[46px]" onClick={online.cancelMatch} icon={<X />}>
              {t("online.cancelMatch")}
            </Button>
          ) : (
            <Button className="min-h-[46px]" onClick={online.quickMatch} icon={<Swords />}>
              {t("online.quickMatch")}
            </Button>
          )}
        </div>

        <form className="mb-[18px] flex gap-2" onSubmit={joinByCode}>
          <Input
            className="min-h-[44px] flex-1 rounded-[10px] border border-[var(--panel-border)] bg-white/[0.06] px-3 uppercase text-[var(--ink)]"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder={t("online.roomCodePlaceholder")}
            aria-label={t("online.roomCodePlaceholder")}
          />
          <Button type="submit" icon={<LogIn />}>
            {t("common.join")}
          </Button>
        </form>

        <div className={styles.lobbyBrowser}>
          <div className={styles.lobbyBrowserHead}>
            <span className="panel-title">{t("lobby.title")}</span>
            <IconButton label={t("lobby.refresh")} icon={<RefreshCcw />} onClick={onRefresh} />
          </div>
          {lobby.length === 0 ? <p className={styles.lobbyEmpty}>{t("lobby.empty")}</p> : null}
          <div className={styles.lobbyRoomList}>
            {lobby.map((room) => (
              <span key={room.code} className={styles.lobbyRoom}>
                <strong>{room.hostName || room.code}</strong>
                {room.hostTier ? <em>{t(TIER_LABEL_KEY[room.hostTier])}</em> : null}
                <Button icon={<LogIn />} onClick={() => online.joinRoom(room.code)}>
                  {t("common.join")}
                </Button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
