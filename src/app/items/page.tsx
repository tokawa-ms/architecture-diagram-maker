"use client";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/components/useLanguage";
import { getMessages } from "@/lib/i18n";

export default function ItemsPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

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
              {messages.itemsTitle}
            </h1>
            <p className="mt-3 text-sm text-slate-500">{messages.itemsBody}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-600 sm:grid-cols-3">
              {[
                "Azure",
                "Entra",
                "Logic Apps",
                "Storage",
                "API Management",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />
    </div>
  );
}
