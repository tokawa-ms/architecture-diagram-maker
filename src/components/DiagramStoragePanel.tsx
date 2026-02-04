"use client";

import { useState } from "react";
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
    storageExport: string;
    storageCopy: string;
    storageCopied: string;
    empty: string;
  };
  current: DiagramDocument;
  onLoad: (document: DiagramDocument) => void;
}

export default function DiagramStoragePanel({
  title,
  hint,
  labels,
  current,
  onLoad,
}: DiagramStoragePanelProps) {
  const [items, setItems] = useState<StoredDiagramSummary[]>(() =>
    listStoredDiagrams(),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importValue, setImportValue] = useState("");

  const refreshItems = () => {
    setItems(listStoredDiagrams());
  };

  const handleSave = (overwrite: boolean) => {
    const now = new Date().toISOString();
    const document = {
      ...current,
      id: overwrite ? current.id : `${current.id}-${Date.now()}`,
      updatedAt: now,
      createdAt: overwrite ? current.createdAt : now,
    };
    saveDiagram(document);
    if (!overwrite) {
      onLoad(document);
    }
    refreshItems();
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

  const handleImport = () => {
    const document = importDiagramJson(importValue);
    if (!document) {
      return;
    }
    saveDiagram(document);
    refreshItems();
    setImportValue("");
    onLoad(document);
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
          <textarea
            className="mt-2 h-20 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
          />
          <button
            type="button"
            className="mt-2 rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-900"
            onClick={handleImport}
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
          {items.length === 0 && (
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
                  onClick={() => {
                    const doc = loadDiagram(item.id);
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
                  onClick={() => {
                    deleteDiagram(item.id);
                    console.log("Deleted diagram from storage", item.id);
                    refreshItems();
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
