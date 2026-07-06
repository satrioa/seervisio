"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  getTranslations,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "./index";
import type { TranslationKeys } from "./id";

interface LanguageContextValue {
  lang: SupportedLanguage;
  t: TranslationKeys;
  setLanguage: (lang: SupportedLanguage) => void;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang = "id",
  onLanguageChange,
}: {
  children: React.ReactNode;
  initialLang?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}) {
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  const setLanguage = useCallback(
    (newLang: SupportedLanguage) => {
      setLang(newLang);
      onLanguageChange?.(newLang);
    },
    [onLanguageChange],
  );

  const t = useMemo(() => getTranslations(lang), [lang]);

  const value = useMemo(
    () => ({ lang, t, setLanguage, isLoaded: true }),
    [lang, t, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage, LanguageContextValue };
