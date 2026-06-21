"use client";

import type { Player } from "@animal-chess/game-core";
import { cx } from "@animal-chess/ui";
import { Timer } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./player-badge.module.scss";

/**
 * Corner portrait (top-left = you, bottom-right = opponent) in the Cờ Thú match-skin: ornate
 * avatar frame + name + per-player move clock that pulses when it's that player's turn.
 */
export function PlayerBadge({
  name,
  color,
  side,
  seconds,
  active,
  avatarUrl,
  icon
}: {
  name: string;
  color: Player;
  side: "you" | "foe";
  seconds: number;
  active: boolean;
  avatarUrl?: string | null;
  icon: ReactNode;
}) {
  const urgent = active && seconds <= 15;
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
        <span className={cx(styles.badgeClock, urgent && styles.urgent)}>
          <Timer />
          {seconds}s
        </span>
      </div>
    </div>
  );
}
