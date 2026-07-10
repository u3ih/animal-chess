"use client";

import { PIECE_RANK, type PieceKind, type Player } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { cx } from "@animal-chess/ui";
import { memo } from "react";
import styles from "./captured-rail.module.scss";

/**
 * Compact captured-pieces HUD docked under a PlayerBadge corner: one rank chip per trophy this side
 * has taken. Renders nothing until the first capture so an empty corner stays clean. Memoized —
 * `captured` is a memoized array from the controller, so it only re-renders when trophies change.
 */
export const CapturedRail = memo(function CapturedRail({
  owner,
  captured,
  side
}: {
  owner: Player;
  captured: PieceKind[];
  side: "you" | "foe";
}) {
  const { t } = useTranslation();
  if (captured.length === 0) return null;
  const color = t(owner === "red" ? "colors.blueLower" : "colors.redLower");

  return (
    <div className={cx(styles.capturedRail, styles[owner], styles[side])} title={t("captured.title", { color })}>
      {captured.map((kind) => (
        <span key={kind} className={styles.chip} title={t(`pieces.${kind}`)}>
          {PIECE_RANK[kind]}
        </span>
      ))}
    </div>
  );
});
