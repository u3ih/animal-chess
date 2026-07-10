"use client";

import { useTranslation } from "@animal-chess/i18n";
import { type Me, TIER_LADDER } from "@animal-chess/social-protocol";
import { cx, Modal } from "@animal-chess/ui";
import { Check, Coins, Trophy } from "lucide-react";
import { TierBadge } from "@/components/tier-badge";
import styles from "./rank-ladder.module.scss";

/** Full tier ladder: ELO floors + one-time promotion rewards, with the player's progress marked. */
export function RankLadder({ me, onClose }: { me: Me | null; onClose: () => void }) {
  const { t } = useTranslation();
  const currentTier = me?.rating?.tier ?? null;
  const peakElo = me?.rating?.peakElo ?? null;

  return (
    <Modal onClose={onClose} ariaLabel={t("rank.ladderTitle")}>
      <div className={styles.ladder}>
        <h2 className="panel-title">
          <Trophy />
          {t("rank.ladderTitle")}
        </h2>
        <p className={styles.hint}>{t("rank.ladderHint")}</p>
        <ol>
          {TIER_LADDER.map(({ tier, floor, rewardCoins, rewardXp }) => {
            const reached = peakElo !== null && peakElo >= floor;
            return (
              <li key={tier} className={cx(reached && styles.reached, tier === currentTier && styles.current)}>
                <TierBadge tier={tier} />
                <span className={styles.floor}>
                  {floor === 0 ? t("rank.startTier") : t("rank.floor", { elo: String(floor) })}
                </span>
                {rewardCoins > 0 ? (
                  <span className={styles.reward}>
                    <Coins aria-hidden="true" />
                    {rewardCoins}
                    <em>+{rewardXp} XP</em>
                  </span>
                ) : null}
                {tier === currentTier ? (
                  <span className={styles.marker}>{t("rank.current")}</span>
                ) : reached ? (
                  <span className={styles.marker}>
                    <Check aria-hidden="true" />
                    {t("rank.reached")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </Modal>
  );
}
