"use client";

import * as React from "react";
import { LanguageProvider, type SupportedLanguage } from "@/i18n/useTranslation";
import { getUserPreferencesAction } from "@/server/actions/account-settings.actions";

export function LanguageProviderWrapper({
  children,
  brandSlug,
}: {
  children: React.ReactNode;
  brandSlug: string;
}) {
  const [lang, setLang] = React.useState<SupportedLanguage>("id");

  React.useEffect(() => {
    getUserPreferencesAction(brandSlug).then((res) => {
      if (res.success && (res.data.language === "id" || res.data.language === "en")) {
        setLang(res.data.language as SupportedLanguage);
      }
    });
  }, [brandSlug]);

  return (
    <LanguageProvider initialLang={lang}>
      {children}
    </LanguageProvider>
  );
}
