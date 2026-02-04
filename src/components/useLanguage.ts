"use client";

import { defaultLanguage, type LanguageCode } from "@/lib/i18n";

export const useLanguage = (): LanguageCode => {
  if (typeof window === "undefined") {
    return defaultLanguage;
  }
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang === "ja" || lang === "en") {
    return lang;
  }
  return defaultLanguage;
};
