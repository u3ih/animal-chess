"use client";

import { PIECE_RANK, type PieceKind, type Player } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { cx } from "@animal-chess/ui";
import styles from "./captured-rail.module.scss";

export function CapturedRail({ owner, captured }: { owner: Player; captured: PieceKind[] }) {
  const { t } = useTranslation();
  const color = t(owner === "red" ? "colors.blueLower" : "colors.redLower");

  return (
    <div className={cx(styles.capturedRail, styles[owner])}>
      <div className={styles.railTitle}>{t("captured.title", { color })}</div>
      {captured.length ? (
        captured.map((kind) => (
          <span key={kind} title={t(`pieces.${kind}`)}>
            <strong>{PIECE_RANK[kind]}</strong>
            {t(`pieces.${kind}`)}
          </span>
        ))
      ) : (
        <p>{t("captured.empty")}</p>
      )}
    </div>
  );
}
