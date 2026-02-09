"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MsalAuthGuard from "@/components/MsalAuthGuard";
import { useLanguage } from "@/components/useLanguage";
import { useMsalAuth } from "@/components/useMsalAuth";
import { getMessages } from "@/lib/i18n";
import { useSimpleAuthLoggedIn } from "@/components/useSimpleAuthLoggedIn";

export default function Home() {
  const language = useLanguage();
  const messages = getMessages(language);
  const { msalEnabled, email: msalEmail, displayName: msalDisplayName, logout: msalLogout } = useMsalAuth();
  const simpleAuthLoggedIn = useSimpleAuthLoggedIn();

  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/history", label: messages.navHistory },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

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
        msalUser={msalEnabled ? { displayName: msalDisplayName, email: msalEmail, userLabel: messages.msalUserLabel, logoutLabel: messages.msalLogoutAction, onLogout: () => void msalLogout() } : undefined}
      />
      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
          <div className="rounded-3xl bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {messages.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              {messages.heroBody}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href={`/editor?lang=${language}`}
                className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
              >
                {messages.heroAction}
              </Link>
              <div className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600">
                {messages.azureHint}
              </div>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {messages.itemsTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {messages.itemsBody}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {messages.settingsTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {messages.settingsBody}
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />
    </div>
    </MsalAuthGuard>
  );
}
