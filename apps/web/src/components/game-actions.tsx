"use client";

import { useTranslation } from "@animal-chess/i18n";
import { IconButton } from "@animal-chess/ui";
import { HelpCircle, Home as HomeIcon, LogIn, LogOut, Vibrate, VibrateOff, Volume2, VolumeX } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { STATIC_EXPORT } from "@/lib/flags";

export type AuthAction = "sign-in" | "sign-out-google" | "sign-out-guest";

type GameActionsProps = {
  className?: string;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  hapticsSupported: boolean;
  authAction: AuthAction;
  onMenu: () => void;
  onShowRules: () => void;
  onToggleAudio: () => void;
  onToggleHaptics: () => void;
  onAuth: () => void;
};

/**
 * The match's utility cluster (language, home, rules, sound, haptics, auth). Rendered in the desktop
 * footer, and inside the panels drawer on compact viewports — where the footer sits below a full-height
 * board and is effectively unreachable without scrolling.
 */
export function GameActions({
  className,
  audioEnabled,
  hapticsEnabled,
  hapticsSupported,
  authAction,
  onMenu,
  onShowRules,
  onToggleAudio,
  onToggleHaptics,
  onAuth
}: GameActionsProps) {
  const { t } = useTranslation();
  const authLabel =
    authAction === "sign-in"
      ? t("game.signInGoogle")
      : authAction === "sign-out-guest"
        ? t("game.exitGuest")
        : t("game.signOut");

  return (
    <div className={className}>
      <LanguageSwitcher />
      <IconButton label={t("game.backToMenu")} icon={<HomeIcon />} onClick={onMenu} />
      <IconButton label={t("game.rules")} icon={<HelpCircle />} onClick={onShowRules} />
      <IconButton
        label={t("game.toggleSound")}
        icon={audioEnabled ? <Volume2 /> : <VolumeX />}
        onClick={onToggleAudio}
      />
      {hapticsSupported ? (
        <IconButton
          label={t("game.toggleHaptics")}
          icon={hapticsEnabled ? <Vibrate /> : <VibrateOff />}
          onClick={onToggleHaptics}
        />
      ) : null}
      {STATIC_EXPORT ? null : (
        <IconButton label={authLabel} icon={authAction === "sign-in" ? <LogIn /> : <LogOut />} onClick={onAuth} />
      )}
    </div>
  );
}
