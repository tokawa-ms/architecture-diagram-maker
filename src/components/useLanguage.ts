"use client";

import { useSearchParams } from "next/navigation";
import { defaultLanguage, type LanguageCode } from "@/lib/i18n";

export const useLanguage = (): LanguageCode => {
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang");
  if (lang === "ja" || lang === "en") {
    return lang;
  }
  return defaultLanguage;
};
