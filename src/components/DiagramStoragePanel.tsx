"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DiagramDocument, StoredDiagramSummary } from "@/lib/types";
import {
  deleteDiagram,
  exportDiagramJson,
  importDiagramJson,
  listStoredDiagrams,
  loadDiagram,
  saveDiagram,
} from "@/lib/storage";

interface DiagramStoragePanelProps {
  title: string;
  hint: string;
  labels: {
    storageKeyLabel: string;
    storageSavedAt: string;
    storageActionLabel: string;
    storageLoad: string;
    storageOverwrite: string;
    storageNew: string;
    storageDelete: string;
    storageImport: string;
    storageImportFile: string;
    storageExport: string;
    storageCopy: string;
    storageCopied: string;
    empty: string;
  };
  current: DiagramDocument;
  idPrefix?: string;
  onLoad: (document: DiagramDocument) => void;
}

type StoredDiagramsSnapshot = {
  items: StoredDiagramSummary[];
  loading: boolean;
};

const emptyStoredDiagramsSnapshot: StoredDiagramsSnapshot = {
  items: [],
  loading: true,
};

const storedDiagramsStore = (() => {
  let snapshot = emptyStoredDiagramsSnapshot;
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setSnapshot = (next: StoredDiagramsSnapshot) => {
    snapshot = next;
    emit();
  };

  const refresh = async () => {
    if (typeof window === "undefined") {
      setSnapshot({ items: [], loading: false });
      return;
    }
    setSnapshot({ ...snapshot, loading: true });
    const items = await listStoredDiagrams();
    setSnapshot({ items, loading: false });
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => emptyStoredDiagramsSnapshot,
    subscribe,
    refresh,
  };
})();

const useStoredDiagrams = () => {
  const snapshot = useSyncExternalStore(
    storedDiagramsStore.subscribe,
    storedDiagramsStore.getSnapshot,
    storedDiagramsStore.getServerSnapshot,
  );

  useEffect(() => {
    void storedDiagramsStore.refresh();
  }, []);

  return {
    ...snapshot,
    refresh: storedDiagramsStore.refresh,
  };
};

export default function DiagramStoragePanel({
  title,
  hint,
  labels,
  current,
  idPrefix,
  onLoad,
}: DiagramStoragePanelProps) {
  const { items, loading, refresh } = useStoredDiagrams();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const refreshItems = async () => {
    await refresh();
  };

  const buildNewId = () => {
    const trimmed = idPrefix?.trim();
    const suffix = Date.now();
    return trimmed ? `${trimmed}-${suffix}` : `${suffix}`;
  };

  const handleSave = async (overwrite: boolean) => {
    const now = new Date().toISOString();
    const document = {
      ...current,
      id: overwrite ? current.id : buildNewId(),
      updatedAt: now,
      createdAt: overwrite ? current.createdAt : now,
    };
    await saveDiagram(document);
    if (!overwrite) {
      onLoad(document);
    }
    await refreshItems();
  };

  const handleCopy = async () => {
    const payload = exportDiagramJson(current);
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedId(current.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy diagram JSON", error);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      return;
    }
    try {
      const payload = await importFile.text();
      const document = importDiagramJson(payload);
      if (!document) {
        return;
      }
      await saveDiagram(document);
      await refreshItems();
      setImportFile(null);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
      onLoad(document);
    } catch (error) {
      console.error("Failed to import diagram JSON file", error);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => handleSave(true)}
          >
            {labels.storageOverwrite}
          </button>
          <button
            type="button"
            className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-600"
            onClick={() => handleSave(false)}
          >
            {labels.storageNew}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500">
        <div className="flex items-center justify-between rounded-md border border-dashed border-slate-200 px-3 py-2">
          <span>{labels.storageExport}</span>
          <button
            type="button"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            onClick={handleCopy}
          >
            {copiedId ? labels.storageCopied : labels.storageCopy}
          </button>
        </div>
        <div className="rounded-md border border-dashed border-slate-200 px-3 py-2">
          <label className="text-xs font-semibold text-slate-600">
            {labels.storageImport}
          </label>
          <div className="mt-2 flex flex-col gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-500 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
              aria-label={labels.storageImportFile}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImportFile(file);
              }}
            />
            <span className="text-[11px] text-slate-400">
              {labels.storageImportFile}
            </span>
          </div>
          <button
            type="button"
            className="mt-2 rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
            onClick={handleImport}
            disabled={!importFile}
          >
            {labels.storageImport}
          </button>
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-[1.4fr_1fr_auto] gap-2 text-xs font-semibold text-slate-400">
          <span>{labels.storageKeyLabel}</span>
          <span>{labels.storageSavedAt}</span>
          <span>{labels.storageActionLabel}</span>
        </div>
        <div className="mt-2 grid gap-2 text-xs">
          {!loading && items.length === 0 && (
            <p className="text-xs text-slate-400">{labels.empty}</p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2 rounded-md border border-slate-200 px-2 py-2"
            >
              <span className="truncate text-slate-700">{item.name}</span>
              <span className="text-slate-500">
                {new Date(item.updatedAt).toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  onClick={async () => {
                    const doc = await loadDiagram(item.id);
                    if (doc) {
                      console.log("Loading diagram from storage", item.id);
                      onLoad(doc);
                    }
                  }}
                >
                  {labels.storageLoad}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  onClick={async () => {
                    await deleteDiagram(item.id);
                    console.log("Deleted diagram from storage", item.id);
                    await refreshItems();
                  }}
                >
                  {labels.storageDelete}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
