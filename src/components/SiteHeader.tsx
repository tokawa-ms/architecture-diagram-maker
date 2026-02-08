import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { LanguageCode } from "@/lib/i18n";

interface NavItem {
  href: string;
  label: string;
}

interface SiteHeaderProps {
  navItems: NavItem[];
  currentLanguage: LanguageCode;
  languageLabel: string;
  appName: string;
  tagline: string;
  logoutLabel?: string;
}

export default function SiteHeader({
  navItems,
  currentLanguage,
  languageLabel,
  appName,
  tagline,
  logoutLabel,
}: SiteHeaderProps) {
  const withLang = (href: string) => `${href}?lang=${currentLanguage}`;

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={withLang("/")} className="text-xl font-semibold text-slate-900">
            {appName}
          </Link>
          <p className="text-sm text-slate-500">{tagline}</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <nav className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={withLang(item.href)}
                className="transition hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {logoutLabel && (
            <form action="/api/auth/logout" method="POST">
              <input type="hidden" name="lang" value={currentLanguage} />
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
              >
                {logoutLabel}
              </button>
            </form>
          )}
          <LanguageSwitcher current={currentLanguage} label={languageLabel} />
        </div>
      </div>
    </header>
  );
}
