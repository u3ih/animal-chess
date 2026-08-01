"use client";

import type { Player } from "@animal-chess/game-core";
import { cx } from "@animal-chess/ui";
import { Timer } from "lucide-react";
import { memo, type ReactNode, useSyncExternalStore } from "react";
import { getClockServerSnapshot, getClockSnapshot, subscribeClock } from "@/lib/clock-store";
import styles from "./player-badge.module.scss";

/**
 * Leaf clock that subscribes to the external clock store, so per-second ticks re-render only this
 * `<span>` rather than the whole game tree.
 */
function BadgeClock({ color, active }: { color: Player; active: boolean }) {
  const clock = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);
  const seconds = clock[color];
  const urgent = active && seconds <= 15;
  return (
    <span className={cx(styles.badgeClock, urgent && styles.urgent)}>
      <Timer />
      {seconds}s
    </span>
  );
}

/**
 * Corner portrait (top-left = you, bottom-right = opponent) in the Cờ Thú match-skin: ornate
 * avatar frame + name + per-player move clock that pulses when it's that player's turn.
 */
export const PlayerBadge = memo(function PlayerBadge({
  name,
  color,
  side,
  active,
  avatarUrl,
  icon
}: {
  name: string;
  color: Player;
  side: "you" | "foe";
  active: boolean;
  avatarUrl?: string | null;
  icon: ReactNode;
}) {
  return (
    <div className={cx(styles.playerBadge, styles[color], styles[side], active && styles.active)}>
      <div className={styles.badgeAvatar}>
        {avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: remote avatar on static export; next/image optimization is off
          <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          icon
        )}
      </div>
      <div className={styles.badgeMeta}>
        <strong>{name}</strong>
        <BadgeClock color={color} active={active} />
      </div>
    </div>
  );
});
