"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { RoomPlayer, RoomSnapshot } from "@animal-chess/net-protocol";
import { Button, cx } from "@animal-chess/ui";
import { Check, Copy, DoorOpen, Play, Swords, UserRound } from "lucide-react";
import { useState } from "react";
import { BASE_PATH } from "@/lib/flags";
import styles from "./room-waiting.module.scss";

/** A single player seat: avatar, name, color, and a Host/Ready/You badge. */
function Seat({ player, isHost, isMe, role }: { player?: RoomPlayer; isHost: boolean; isMe: boolean; role: string }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <div className={cx(styles.roomSeat, styles.empty)}>
        <span className={styles.roomAvatar}>
          <UserRound aria-hidden="true" />
        </span>
        <span className={styles.roomSeatName}>{t("room.waitingOpponent")}</span>
      </div>
    );
  }
  return (
    <div className={cx(styles.roomSeat, styles[player.color], !player.connected && styles.offline)}>
      <span className={styles.roomAvatar}>
        {player.avatar ? (
          // biome-ignore lint/performance/noImgElement: remote avatar; next/image optimization is off here
          <img src={player.avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <UserRound aria-hidden="true" />
        )}
      </span>
      <span className={styles.roomSeatName}>
        {player.username}
        {isMe ? <em className={cx(styles.roomTag, styles.you)}>{t("room.you")}</em> : null}
      </span>
      <span className={styles.roomBadges}>
        <span className={cx(styles.roomTag, styles[`color-${player.color}`])}>{role}</span>
        {isHost ? (
          <span className={cx(styles.roomTag, styles.host)}>{t("room.host")}</span>
        ) : (
          <span className={cx(styles.roomTag, styles[player.ready ? "ready" : "idle"])}>
            {player.ready ? t("room.readyTag") : t("room.notReadyTag")}
          </span>
        )}
        {!player.connected ? (
          <span className={cx(styles.roomTag, styles.offline)}>{t("room.disconnected")}</span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The ready room shown while a room is in the `lobby` phase: both seats with avatars, a share link,
 * and the ready/start controls. The host holds the Start button; the opponent toggles Ready.
 */
export function RoomWaiting({
  snapshot,
  isHost,
  meId,
  onToggleReady,
  onStart,
  onLeave
}: {
  snapshot: RoomSnapshot;
  isHost: boolean;
  meId?: string;
  onToggleReady: () => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const host = snapshot.players[0];
  const opponent = snapshot.players[1];
  const me = snapshot.players.find((p) => p.userId === meId);
  const canStart = Boolean(opponent?.connected && opponent.ready);

  function shareRoom() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${BASE_PATH}/?room=${snapshot.id}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.roomWaiting}>
      <div className={styles.roomCodeRow}>
        <strong>{t("online.roomCode", { id: snapshot.id })}</strong>
        <Button onClick={shareRoom} icon={copied ? <Check /> : <Copy />}>
          {copied ? t("online.copied") : t("online.shareLink")}
        </Button>
      </div>

      <div className={styles.roomSeats}>
        <Seat player={host} isHost isMe={host?.userId === meId} role={t("colors.red")} />
        <Swords className={styles.roomVs} aria-hidden="true" />
        <Seat player={opponent} isHost={false} isMe={opponent?.userId === meId} role={t("colors.blue")} />
      </div>

      <div className={styles.roomControls}>
        {isHost ? (
          <>
            <Button variant="primary" onClick={onStart} disabled={!canStart} icon={<Play />}>
              {t("room.start")}
            </Button>
            {canStart ? null : <p className={styles.roomHint}>{t("room.startHint")}</p>}
          </>
        ) : (
          <>
            <Button variant={me?.ready ? "default" : "primary"} onClick={onToggleReady} icon={<Check />}>
              {me?.ready ? t("room.cancelReady") : t("room.ready")}
            </Button>
            {me?.ready ? <p className={styles.roomHint}>{t("room.waitingHostStart")}</p> : null}
          </>
        )}
        <Button onClick={onLeave} icon={<DoorOpen />}>
          {t("room.leave")}
        </Button>
      </div>
    </div>
  );
}
