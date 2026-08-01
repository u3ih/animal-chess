"use client";

import { useTranslation } from "@animal-chess/i18n";
import type { Tier } from "@animal-chess/social-protocol";
import { cx } from "@animal-chess/ui";
import { Medal } from "lucide-react";
import { TIER_LABEL_KEY } from "@/lib/labels";
import styles from "./tier-badge.module.scss";

const DIVISION_ROMAN = ["", "I", "II", "III"] as const;

/** Colored rank pill (Bronze → Grandmaster). Division renders as roman numerals; apex tiers have none. */
export function TierBadge({ tier, division, className }: { tier: Tier; division?: number | null; className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={cx(styles.badge, styles[tier.toLowerCase()], className)} title={t("rank.tier")}>
      <Medal aria-hidden="true" />
      {t(TIER_LABEL_KEY[tier])}
      {division ? ` ${DIVISION_ROMAN[division]}` : ""}
    </span>
  );
}
