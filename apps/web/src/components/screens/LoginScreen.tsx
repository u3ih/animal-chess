"use client";

import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, Input } from "@animal-chess/ui";
import { LogIn, Sparkles, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { STATIC_EXPORT } from "@/lib/flags";
import styles from "./LoginScreen.module.scss";

/**
 * Login gate shown when there is no identity yet. Offers Google sign-in (full-server build only)
 * and a "continue as guest" name entry. Picking either yields an identity and reveals the menu.
 */
export function LoginScreen({ onGoogle, onGuest }: { onGoogle: () => void; onGuest: (username: string) => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");

  function submitGuest(event: FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) return;
    onGuest(trimmed);
  }

  return (
    <main className={cx("menu-screen", styles.loginScreen)}>
      <div className="menu-card">
        <div className="menu-toolbar">
          <LanguageSwitcher className="menu-lang" />
        </div>
        <div className={cx("brand-logo", styles.loginLogo)}>
          <Sparkles aria-hidden="true" />
          <span>{t("game.title")}</span>
        </div>
        <h1 className="menu-title">{t("login.title")}</h1>
        <p className="menu-sub">{t("login.subtitle")}</p>

        {STATIC_EXPORT ? null : (
          <>
            <Button variant="primary" className={styles.loginGoogle} onClick={onGoogle} icon={<LogIn />}>
              {t("login.google")}
            </Button>
            <p className={styles.loginDivider}>
              <span>{t("login.or")}</span>
            </p>
          </>
        )}

        <form className={styles.loginGuest} onSubmit={submitGuest}>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("login.guestPlaceholder")}
            aria-label={t("login.guestPlaceholder")}
          />
          <Button type="submit" icon={<UserRound />}>
            {t("login.guestCta")}
          </Button>
        </form>
      </div>
    </main>
  );
}
