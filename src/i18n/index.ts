import idTranslations from "./id";
import enTranslations from "./en";
import type { TranslationKeys } from "./id";

export { default as id } from "./id";
export { default as en } from "./en";
export type { TranslationKeys } from "./id";

export const SUPPORTED_LANGUAGES = [
  { value: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { value: "en", label: "English", flag: "🇺🇸" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

const translations: Record<SupportedLanguage, TranslationKeys> = {
  id: idTranslations as TranslationKeys,
  en: enTranslations as TranslationKeys,
};

export function getTranslations(lang: SupportedLanguage): TranslationKeys {
  return translations[lang] ?? translations.id;
}

export { translations };
