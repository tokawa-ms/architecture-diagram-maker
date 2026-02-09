"use client";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MsalAuthGuard from "@/components/MsalAuthGuard";
import { useLanguage } from "@/components/useLanguage";
import { useMsalAuth } from "@/components/useMsalAuth";
import { getMessages } from "@/lib/i18n";
import { useSimpleAuthLoggedIn } from "@/components/useSimpleAuthLoggedIn";

export default function AboutPage() {
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
        <section className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-12">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">
              {messages.aboutTitle}
            </h1>
            <p className="mt-3 text-sm text-slate-500">{messages.aboutBody}</p>
            <p className="mt-4 text-sm text-slate-500">{messages.azureHint}</p>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />
    </div>
    </MsalAuthGuard>
  );
}
