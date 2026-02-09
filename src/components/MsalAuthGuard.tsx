"use client";

import { type ReactNode } from "react";
import { useMsalAuth } from "@/components/useMsalAuth";
import { useLanguage } from "@/components/useLanguage";
import { getMessages } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface MsalAuthGuardProps {
  children: ReactNode;
}

/**
 * Client-side auth guard for MSAL (Entra ID).
 *
 * - If MSAL is **not** configured the children are rendered immediately.
 * - If MSAL is configured but the user is **not** authenticated, a sign-in
 *   prompt is shown.
 * - If the user **is** authenticated the children are rendered.
 */
export default function MsalAuthGuard({ children }: MsalAuthGuardProps) {
  const { msalEnabled, isAuthenticated, inProgress, login } = useMsalAuth();
  const language = useLanguage();
  const messages = getMessages(language);

  if (!msalEnabled) {
    return <>{children}</>;
  }

  if (inProgress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">{messages.msalLoading}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xl font-semibold text-slate-900">
                {messages.appName}
              </div>
              <p className="text-sm text-slate-500">{messages.tagline}</p>
            </div>
            <LanguageSwitcher current={language} label={messages.languageLabel} />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="relative mx-auto w-[360px] max-w-[90vw]">
            <div className="pointer-events-none absolute -inset-4 rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_55%)]" />
            <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
              <div className="text-center">
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {messages.loginTitle}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {messages.msalLoginSubtitle}
                </p>
              </div>
              <div className="mx-auto mt-6 grid w-[280px] max-w-[80vw] gap-4">
                <button
                  type="button"
                  className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
                  onClick={() => void login()}
                >
                  {messages.msalLoginAction}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
