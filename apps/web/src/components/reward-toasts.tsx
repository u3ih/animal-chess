"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { RewardEvent } from "@animal-chess/social-protocol";
import { IconButton } from "@animal-chess/ui";
import { Award, Coins, X } from "lucide-react";
import { useEffect } from "react";
import { TIER_LABEL_KEY } from "@/lib/labels";
import styles from "./reward-toasts.module.scss";

const AUTO_DISMISS_MS = 4500;

/** Stacked "you earned…" toasts (match rewards, tier promotions, achievements). Auto-dismiss oldest. */
export function RewardToasts({ toasts, onDismiss }: { toasts: RewardEvent[]; onDismiss: (index: number) => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => onDismiss(0), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  function label(toast: RewardEvent): string {
    if (toast.tier) return t("toast.tierUp", { tier: t(TIER_LABEL_KEY[toast.tier]) });
    if (toast.achievement) return t("toast.achievement");
    switch (toast.source) {
      case "win":
        return t("toast.win");
      case "loss":
        return t("toast.loss");
      case "draw":
        return t("toast.draw");
      case "level_up":
        return t("toast.levelUp");
      default:
        return t("toast.quest");
    }
  }

  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((toast, index) => (
        <div key={`${toast.source}-${toast.achievement ?? toast.tier ?? ""}-${index}`} className={styles.toast}>
          <Award aria-hidden="true" />
          <span className={styles.label}>{label(toast)}</span>
          {toast.coins > 0 || toast.xp > 0 ? (
            <span className={styles.amount}>
              <Coins aria-hidden="true" />
              {toast.coins}
              <em>+{toast.xp} XP</em>
            </span>
          ) : null}
          <IconButton label={t("toast.dismiss")} icon={<X />} onClick={() => onDismiss(index)} />
        </div>
      ))}
    </div>
  );
}
