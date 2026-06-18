"use client";

import { LANGUAGES, type Language, useTranslation } from "@animal-chess/i18n";
import { Select } from "@animal-chess/ui";
import { LANG_STORAGE_KEY } from "@/app/i18n-provider";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();

  function change(lang: Language) {
    void i18n.changeLanguage(lang);
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  }

  return (
    <Select
      className={className}
      aria-label={t("language.label")}
      value={i18n.language}
      onChange={(event) => change(event.target.value as Language)}
      options={LANGUAGES.map((lng) => ({ value: lng, label: t(`language.${lng}`) }))}
    />
  );
}
