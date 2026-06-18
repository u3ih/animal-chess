"use client";

import { getI18n, I18nextProvider, isLanguage } from "@animal-chess/i18n";
import { useEffect } from "react";

export const LANG_STORAGE_KEY = "animal-chess-lang";

// Created exactly once. SSR + first client render share the default language (vi); the stored
// choice is applied in an effect, so there is no hydration mismatch and no app-wide re-render
// is triggered from React state — react-i18next notifies only `useTranslation` consumers.
export const i18n = getI18n();

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLanguage(stored) && stored !== i18n.language) i18n.changeLanguage(stored);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
