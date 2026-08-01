"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { DailyStatus, Quest } from "@animal-chess/social-protocol";
import { Button, Panel } from "@animal-chess/ui";
import { Gift, Trophy } from "lucide-react";

export function RewardsPanel({
  dailyStatus,
  quests,
  onClaimDaily,
  onClaimQuest
}: {
  dailyStatus: DailyStatus | null;
  quests: Quest[];
  onClaimDaily: () => void;
  onClaimQuest: (questId: string) => void;
}) {
  const { t } = useTranslation();
  // Quest codes come from the backend, so the i18n key is dynamic; fall back to the code.
  const questLabel = t as (key: string, opts?: Record<string, unknown>) => string;
  return (
    <Panel className="rewards-panel" icon={<Gift />} title={t("gamification.title")}>
      <Button disabled={!dailyStatus?.claimable} onClick={onClaimDaily} icon={<Gift />}>
        {dailyStatus?.claimable ? t("gamification.claimDaily") : t("gamification.claimed")}
      </Button>
      {dailyStatus ? <small>{t("gamification.streakDays", { count: dailyStatus.streak })}</small> : null}
      <div className="quest-list">
        {quests.length === 0 ? <p>{t("quests.empty")}</p> : null}
        {quests.map((quest) => (
          <div key={quest.id} className="quest">
            <span>{questLabel(`quests.${quest.code}`, { defaultValue: quest.code })}</span>
            <span className="quest-progress">
              {quest.progress}/{quest.target}
            </span>
            {quest.completed && !quest.claimed ? (
              <Button onClick={() => onClaimQuest(quest.id)} icon={<Trophy />}>
                {t("quests.claim")}
              </Button>
            ) : quest.claimed ? (
              <em>{t("quests.claimed")}</em>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
