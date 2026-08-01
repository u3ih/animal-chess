"use client";

import type { Player } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, Modal } from "@animal-chess/ui";
import { Home, RefreshCw, Trophy } from "lucide-react";
import styles from "./WinOverlay.module.scss";

export function WinOverlay({
  winner,
  reason,
  mode,
  onNewGame,
  onRematch,
  onMenu
}: {
  winner: Player;
  reason: "den" | "elimination";
  mode: "ai" | "online";
  onNewGame: () => void;
  onRematch: () => void;
  onMenu: () => void;
}) {
  const { t } = useTranslation();
  const winnerLabel = t(winner === "red" ? "colors.red" : "colors.blue");
  const reasonLabel = t(reason === "den" ? "winReasonLong.den" : "winReasonLong.elimination");

  return (
    <Modal
      ariaLabel={t("win.ariaLabel")}
      role="alertdialog"
      backdropClassName="win-backdrop"
      className={cx(styles.winCard, styles[winner])}
    >
      <div className={styles.winTrophy}>
        <Trophy />
      </div>
      <p className={styles.winEyebrow}>{t("win.eyebrow")}</p>
      <h2>{t("win.title", { color: winnerLabel })}</h2>
      <p className={styles.winReason}>{t("win.reason", { reason: reasonLabel })}</p>
      <div className={styles.winActions}>
        {mode === "online" ? (
          <Button variant="primary" onClick={onRematch} icon={<RefreshCw />}>
            {t("win.rematch")}
          </Button>
        ) : (
          <Button variant="primary" onClick={onNewGame} icon={<RefreshCw />}>
            {t("win.newGame")}
          </Button>
        )}
        <Button onClick={onMenu} icon={<Home />}>
          {t("win.menu")}
        </Button>
      </div>
    </Modal>
  );
}
