"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/components/useLanguage";
import { getMessages } from "@/lib/i18n";
import type { DiagramHistoryEntrySummary } from "@/lib/types";
import {
  listHistoryEntries,
  loadHistoryEntry,
  saveDiagram,
  saveDraftDiagram,
} from "@/lib/storage";

export default function HistoryPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const router = useRouter();
  const [items, setItems] = useState<DiagramHistoryEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/history", label: messages.navHistory },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

  useEffect(() => {
    try {
      setItems(listHistoryEntries());
      setLoadError(false);
    } catch (error) {
      console.error("Failed to load history entries", error);
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRollback = async (entryId: string) => {
    setRollbackId(entryId);
    try {
      const document = loadHistoryEntry(entryId);
      if (!document) {
        setLoadError(true);
        return;
      }
      const now = new Date().toISOString();
      const next = { ...document, updatedAt: now };
      saveDraftDiagram(next);
      await saveDiagram(next);
      router.push(`/editor?lang=${language}`);
    } catch (error) {
      console.error("Failed to rollback history entry", error);
      setLoadError(true);
    } finally {
      setRollbackId(null);
    }
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
        <section className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-12">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">
              {messages.historyTitle}
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {messages.historyBody}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="grid grid-cols-[1.4fr_1fr_auto_auto] gap-3 text-xs font-semibold text-slate-400">
              <span>{messages.historyDiagram}</span>
              <span>{messages.historySavedAt}</span>
              <span>{messages.historyElements}</span>
              <span>{messages.historyAction}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs">
              {!loading && items.length === 0 && !loadError && (
                <p className="text-xs text-slate-400">{messages.historyEmpty}</p>
              )}
              {loadError && (
                <p className="text-xs text-rose-500">{messages.historyError}</p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-3 rounded-md border border-slate-200 px-3 py-2"
                >
                  <div className="flex flex-col gap-1">
                    <span className="truncate text-slate-700">{item.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {item.diagramId}
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {new Date(item.savedAt).toLocaleString()}
                  </span>
                  <span className="text-slate-500">{item.elementCount}</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handleRollback(item.id)}
                    disabled={rollbackId !== null}
                  >
                    {rollbackId === item.id
                      ? messages.historyRollingBack
                      : messages.historyRollback}
                  </button>
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
