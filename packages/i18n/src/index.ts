import i18next, { type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import vi from "./locales/vi";
import "./types";

export const LANGUAGES = ["vi", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "vi";
export const FALLBACK_LANGUAGE: Language = "vi";
export const DEFAULT_NS = "translation";

export const resources = {
  vi: { translation: vi },
  en: { translation: en }
} as const;

export function isLanguage(value: string | null | undefined): value is Language {
  return value != null && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Build a configured, framework-agnostic i18next instance. The caller supplies the initial
 * language (no browser APIs are touched here) so the same package works in web and React Native.
 */
export function createI18n(lng: Language = DEFAULT_LANGUAGE): i18n {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: DEFAULT_NS,
    interpolation: { escapeValue: false },
    returnNull: false
  });
  return instance;
}

let singleton: i18n | undefined;

/** Lazily-created shared instance for single-runtime apps (e.g. the web client). */
export function getI18n(lng: Language = DEFAULT_LANGUAGE): i18n {
  if (!singleton) singleton = createI18n(lng);
  return singleton;
}

export { I18nextProvider, Trans, useTranslation } from "react-i18next";
export { en, vi };
