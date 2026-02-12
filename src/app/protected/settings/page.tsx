"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MsalAuthGuard from "@/components/MsalAuthGuard";
import { useLanguage } from "@/components/useLanguage";
import { useMsalAuth } from "@/components/useMsalAuth";
import { getMessages } from "@/lib/i18n";
import { useSimpleAuthLoggedIn } from "@/components/useSimpleAuthLoggedIn";
import {
  EXPORT_SCALE_STORAGE_KEY,
  getDefaultExportScale,
  getDefaultHistoryLimit,
  getExportScale,
  getHistoryLimit,
  HISTORY_LIMIT_STORAGE_KEY,
  setExportScale,
  setHistoryLimit,
} from "@/lib/settings";

type SettingsSnapshot = {
  historyLimit: number;
  exportScale: number;
};

type DiagnosticsPayload = {
  cosmos: {
    configured: boolean;
    status: "not_configured" | "connected" | "error";
    message?: string;
  };
};

type DiagnosticsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: DiagnosticsPayload };

const readSettingsSnapshot = (): SettingsSnapshot => ({
  historyLimit: getHistoryLimit(),
  exportScale: getExportScale(),
});

const serverSnapshot: SettingsSnapshot = {
  historyLimit: getDefaultHistoryLimit(),
  exportScale: getDefaultExportScale(),
};

const settingsStore = (() => {
  let snapshot = readSettingsSnapshot();
  const listeners = new Set<() => void>();

  const emitIfChanged = (next: SettingsSnapshot) => {
    if (
      next.historyLimit === snapshot.historyLimit &&
      next.exportScale === snapshot.exportScale
    ) {
      return;
    }
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const updateSnapshot = () => {
    emitIfChanged(readSettingsSnapshot());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (typeof window === "undefined") {
      return () => {
        listeners.delete(listener);
      };
    }
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === HISTORY_LIMIT_STORAGE_KEY ||
        event.key === EXPORT_SCALE_STORAGE_KEY
      ) {
        updateSnapshot();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
    };
  };

  const setHistoryLimitValue = (value: number) => {
    setHistoryLimit(value);
    updateSnapshot();
  };

  const setExportScaleValue = (value: number) => {
    setExportScale(value);
    updateSnapshot();
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe,
    setHistoryLimitValue,
    setExportScaleValue,
  };
})();

export default function SettingsPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const {
    msalEnabled,
    isAuthenticated: msalAuthenticated,
    inProgress: msalInProgress,
    email: msalEmail,
    displayName: msalDisplayName,
    logout: msalLogout,
  } = useMsalAuth();
  const simpleAuthLoggedIn = useSimpleAuthLoggedIn();
  const simpleAuthEnabled =
    process.env.NEXT_PUBLIC_SIMPLE_AUTH_ENABLED === "true";
  const { historyLimit, exportScale } = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getServerSnapshot,
  );
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    status: "loading",
  });
  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/history", label: messages.navHistory },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

  const handleHistoryLimitChange = (value: number) => {
    settingsStore.setHistoryLimitValue(value);
  };

  const handleExportScaleChange = (value: number) => {
    settingsStore.setExportScaleValue(value);
  };

  useEffect(() => {
    let active = true;
    const loadDiagnostics = async () => {
      try {
        const response = await fetch("/api/diagnostics", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(messages.diagnosticsError);
        }
        const payload = (await response.json()) as DiagnosticsPayload;
        if (active) {
          setDiagnostics({ status: "ready", payload });
        }
      } catch (error) {
        console.error("Failed to load diagnostics", error);
        if (active) {
          setDiagnostics({
            status: "error",
            message: messages.diagnosticsError,
          });
        }
      }
    };

    void loadDiagnostics();
    return () => {
      active = false;
    };
  }, [messages.diagnosticsError]);

  const cosmosStatusLabel = useMemo(() => {
    if (diagnostics.status === "loading") return messages.diagnosticsLoading;
    if (diagnostics.status === "error") return messages.diagnosticsError;
    const status = diagnostics.payload.cosmos.status;
    if (status === "connected") return messages.diagnosticsCosmosConnected;
    if (status === "error") return messages.diagnosticsCosmosError;
    return messages.diagnosticsCosmosNotConfigured;
  }, [diagnostics, messages]);

  const cosmosDetail = useMemo(() => {
    if (diagnostics.status === "loading") return messages.diagnosticsLoading;
    if (diagnostics.status === "error") return diagnostics.message;
    if (!diagnostics.payload.cosmos.configured) {
      return messages.diagnosticsCosmosConfigMissing;
    }
    if (diagnostics.payload.cosmos.status === "error") {
      const suffix = diagnostics.payload.cosmos.message
        ? ` (${diagnostics.payload.cosmos.message})`
        : "";
      return `${messages.diagnosticsCosmosErrorDetail}${suffix}`;
    }
    return messages.diagnosticsCosmosReady;
  }, [diagnostics, messages]);

  const authMethodLabel = useMemo(() => {
    if (msalEnabled) return messages.diagnosticsAuthEntra;
    if (simpleAuthEnabled) return messages.diagnosticsAuthSimple;
    return messages.diagnosticsAuthNone;
  }, [messages, msalEnabled, simpleAuthEnabled]);

  const authStatusLabel = useMemo(() => {
    if (msalEnabled) {
      if (msalInProgress) return messages.diagnosticsAuthChecking;
      return msalAuthenticated
        ? messages.diagnosticsAuthSignedIn
        : messages.diagnosticsAuthSignedOut;
    }
    if (simpleAuthEnabled) {
      return simpleAuthLoggedIn
        ? messages.diagnosticsAuthSignedIn
        : messages.diagnosticsAuthSignedOut;
    }
    return messages.diagnosticsAuthUnavailable;
  }, [
    messages,
    msalEnabled,
    msalAuthenticated,
    msalInProgress,
    simpleAuthEnabled,
    simpleAuthLoggedIn,
  ]);

  const authDetail = useMemo(() => {
    if (msalEnabled) {
      return msalEmail
        ? `${messages.diagnosticsAuthUserPrefix} ${msalEmail}`
        : messages.diagnosticsAuthNoUser;
    }
    if (simpleAuthEnabled) {
      return simpleAuthLoggedIn
        ? messages.diagnosticsAuthSimpleLoggedIn
        : messages.diagnosticsAuthSimpleLoggedOut;
    }
    return messages.diagnosticsAuthNoneDetail;
  }, [
    messages,
    msalEnabled,
    msalEmail,
    simpleAuthEnabled,
    simpleAuthLoggedIn,
  ]);

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
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {messages.exportScaleTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {messages.exportScaleBody}
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                {messages.exportScaleLabel}
              </span>
              <input
                type="number"
                min={1}
                max={8}
                step={1}
                className="w-40 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                value={exportScale}
                onChange={(event) =>
                  handleExportScaleChange(Number(event.target.value))
                }
              />
              <span className="text-xs text-slate-400">
                {messages.exportScaleHint}
              </span>
            </label>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {messages.diagnosticsTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {messages.diagnosticsBody}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {messages.diagnosticsCosmosLabel}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {cosmosStatusLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">{cosmosDetail}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {messages.diagnosticsAuthLabel}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {authMethodLabel}
                </p>
                <p className="mt-1 text-sm text-slate-600">{authStatusLabel}</p>
                <p className="mt-1 text-xs text-slate-500">{authDetail}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />
    </div>
    </MsalAuthGuard>
  );
}
