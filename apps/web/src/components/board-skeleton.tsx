"use client";

import { useTranslation } from "@animal-chess/i18n";
import { cx } from "@animal-chess/ui";
import styles from "./board-skeleton.module.scss";

/**
 * Loading placeholder for the WebGL board: fills `.board3d` with a shimmering 7×9 grid hint + spinner.
 * `overlay` docks it over a mounted canvas so it can fade out (`hidden`) once the first frame paints —
 * the scene has zero async assets, so there is no real progress to report, only the compile/first-frame gap.
 */
export function BoardSkeleton({ overlay, hidden }: { overlay?: boolean; hidden?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={cx(styles.skeleton, overlay && styles.overlay, hidden && styles.hidden)} aria-hidden={hidden}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>{t("game.boardLoading")}</p>
    </div>
  );
}
