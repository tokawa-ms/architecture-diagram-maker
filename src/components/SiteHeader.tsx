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
  /** MSAL-specific props (optional) */
  msalUser?: {
    displayName: string | null;
    email: string | null;
    userLabel: string;
    logoutLabel: string;
    onLogout: () => void;
  };
}

export default function SiteHeader({
  navItems,
  currentLanguage,
  languageLabel,
  appName,
  tagline,
  logoutLabel,
  msalUser,
}: SiteHeaderProps) {
  const withLang = (href: string) => `${href}?lang=${currentLanguage}`;

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur" style={{ padding: "8px 24px" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          {/* MSAL user info & logout */}
          {msalUser && msalUser.email && (
            <div className="flex items-center gap-2">
              <Link
                href={withLang("/account")}
                className="text-xs text-slate-500 transition hover:text-sky-600"
                title={msalUser.email}
              >
                {msalUser.userLabel}: <span className="font-medium text-slate-700">{msalUser.displayName ?? msalUser.email}</span>
              </Link>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                onClick={msalUser.onLogout}
              >
                {msalUser.logoutLabel}
              </button>
            </div>
          )}
          {/* Simple auth logout */}
          {!msalUser && logoutLabel && (
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
