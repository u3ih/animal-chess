"use client";

import type { Player } from "@animal-chess/game-core";
import { cx } from "@animal-chess/ui";
import { Timer } from "lucide-react";
import type { ReactNode } from "react";

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
    <div className={cx("player-badge", color, side, active && "active")}>
      <div className="badge-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : icon}
      </div>
      <div className="badge-meta">
        <strong>{name}</strong>
        <span className={cx("badge-clock", urgent && "urgent")}>
          <Timer />
          {seconds}s
        </span>
      </div>
    </div>
  );
}
