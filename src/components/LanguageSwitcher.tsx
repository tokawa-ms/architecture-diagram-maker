"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supportedLanguages, type LanguageCode } from "@/lib/i18n";

interface LanguageSwitcherProps {
  current: LanguageCode;
  label: string;
}

export default function LanguageSwitcher({ current, label }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
        value={current}
        onChange={(event) => handleChange(event.target.value)}
        aria-label={label}
      >
        {supportedLanguages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
