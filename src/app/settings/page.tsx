"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/components/useLanguage";
import { getMessages } from "@/lib/i18n";
import { getHistoryLimit, setHistoryLimit } from "@/lib/settings";

export default function SettingsPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const [historyLimit, setHistoryLimitState] = useState(() => getHistoryLimit());
  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

  useEffect(() => {
    setHistoryLimitState(getHistoryLimit());
  }, []);

  const handleHistoryLimitChange = (value: number) => {
    setHistoryLimit(value);
    setHistoryLimitState(getHistoryLimit());
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        navItems={navItems}
        currentLanguage={language}
        languageLabel={messages.languageLabel}
        appName={messages.appName}
        tagline={messages.tagline}
      />
      <main className="flex-1">
        <section className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-12">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">
              {messages.settingsTitle}
            </h1>
            <p className="mt-3 text-sm text-slate-500">{messages.settingsBody}</p>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {messages.historyLimitTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {messages.historyLimitBody}
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                {messages.historyLimitLabel}
              </span>
              <input
                type="number"
                min={10}
                max={1000}
                step={1}
                className="w-40 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                value={historyLimit}
                onChange={(event) =>
                  handleHistoryLimitChange(Number(event.target.value))
                }
              />
              <span className="text-xs text-slate-400">
                {messages.historyLimitHint}
              </span>
            </label>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />
    </div>
  );
}
