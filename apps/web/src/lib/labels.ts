import type { Tier } from "@animal-chess/social-protocol";

/** Maps a backend tier enum to its (literal, type-checked) i18n key. */
export const TIER_LABEL_KEY = {
  BRONZE: "tier.bronze",
  SILVER: "tier.silver",
  GOLD: "tier.gold",
  PLATINUM: "tier.platinum",
  DIAMOND: "tier.diamond",
  MASTER: "tier.master",
  GRANDMASTER: "tier.grandmaster"
} as const satisfies Record<Tier, string>;
