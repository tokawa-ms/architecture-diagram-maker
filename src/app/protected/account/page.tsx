"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MsalAuthGuard from "@/components/MsalAuthGuard";
import { useLanguage } from "@/components/useLanguage";
import { useMsalAuth } from "@/components/useMsalAuth";
import { getMessages } from "@/lib/i18n";
import { useSimpleAuthLoggedIn } from "@/components/useSimpleAuthLoggedIn";

export default function AccountPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const {
    msalEnabled,
    email: msalEmail,
    displayName: msalDisplayName,
    tenantId: msalTenantId,
    logout: msalLogout,
  } = useMsalAuth();
  const simpleAuthLoggedIn = useSimpleAuthLoggedIn();

  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/history", label: messages.navHistory },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

  const withLang = (href: string) => `${href}?lang=${language}`;

  return (
    <MsalAuthGuard>
      <div className="flex min-h-screen flex-col">
        <SiteHeader
          navItems={navItems}
          currentLanguage={language}
          languageLabel={messages.languageLabel}
          appName={messages.appName}
          tagline={messages.tagline}
          logoutLabel={!msalEnabled && simpleAuthLoggedIn ? messages.logoutAction : undefined}
          msalUser={
            msalEnabled
              ? {
                  displayName: msalDisplayName,
                  email: msalEmail,
                  userLabel: messages.msalUserLabel,
                  logoutLabel: messages.msalLogoutAction,
                  onLogout: () => void msalLogout(),
                }
              : undefined
          }
        />
        <main className="flex-1">
          <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
            <div className="rounded-3xl bg-white p-8 shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">
                {messages.msalAccountInfoTitle}
              </h1>

              <dl className="mt-6 divide-y divide-slate-100">
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="w-40 shrink-0 text-sm font-semibold text-slate-500">
                    {messages.msalAccountDisplayName}
                  </dt>
                  <dd className="text-sm text-slate-800">
                    {msalDisplayName ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="w-40 shrink-0 text-sm font-semibold text-slate-500">
                    {messages.msalAccountEmail}
                  </dt>
                  <dd className="text-sm text-slate-800">
                    {msalEmail ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="w-40 shrink-0 text-sm font-semibold text-slate-500">
                    {messages.msalAccountTenantId}
                  </dt>
                  <dd className="font-mono text-sm text-slate-800">
                    {msalTenantId ?? "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex gap-4">
                {msalEnabled && (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600"
                    onClick={() => void msalLogout()}
                  >
                    {messages.msalLogoutAction}
                  </button>
                )}
                <Link
                  href={withLang("/")}
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-slate-900"
                >
                  {messages.navHome}
                </Link>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter text={messages.footerText} />
      </div>
    </MsalAuthGuard>
  );
}
