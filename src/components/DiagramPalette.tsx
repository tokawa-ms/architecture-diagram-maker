"use client";

import { useEffect, useMemo, useState } from "react";

interface PaletteItem {
  id: string;
  name: string;
  src: string;
  folder?: string;
}

interface DiagramPaletteProps {
  title: string;
  searchLabel: string;
  hint: string;
  emptyLabel: string;
  onSelect: (item: PaletteItem) => void;
}

type IconsApiResponse = {
  items: PaletteItem[];
};

export default function DiagramPalette({
  title,
  searchLabel,
  hint,
  emptyLabel,
  onSelect,
}: DiagramPaletteProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [expandedByFolder, setExpandedByFolder] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/icons", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load icons: ${res.status}`);
        }
        const data = (await res.json()) as IconsApiResponse;
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        console.error("Failed to fetch icons", error);
        if (!cancelled) {
          setItems([]);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const base = items;
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((item) => {
      const name = item.name.toLowerCase();
      const folder = (item.folder ?? "").toLowerCase();
      return name.includes(q) || folder.includes(q);
    });
  }, [items, query]);

  const isSearching = query.trim().length > 0;

  const groups = useMemo(() => {
    const byFolder = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const folder = item.folder ?? "";
      const list = byFolder.get(folder) ?? [];
      list.push(item);
      byFolder.set(folder, list);
    }

    const sortedFolders = [...byFolder.keys()].sort((a, b) => a.localeCompare(b));
    return sortedFolders.map((folder) => {
      const list = byFolder.get(folder) ?? [];
      list.sort((a, b) => a.name.localeCompare(b.name));
      return { folder, items: list };
    });
  }, [filtered]);

  const isExpanded = (folder: string) => {
    if (!folder) return true;
    const explicit = expandedByFolder[folder];
    if (explicit === true) return true;
    if (explicit === false) return false;
    return isSearching;
  };

  const toggleFolder = (folder: string) => {
    setExpandedByFolder((prev) => {
      const next = { ...prev };
      next[folder] = !isExpanded(folder);
      return next;
    });
  };

  return (
    <div className="max-h-[65vh] rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <input
        type="search"
        placeholder={searchLabel}
        className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={searchLabel}
      />
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto space-y-4">
        {filtered.length === 0 && (
          <p className="text-center text-xs text-slate-400">{emptyLabel}</p>
        )}
        {groups.map((group) => (
          <div key={group.folder || "__root"}>
            {group.folder && (
              <button
                type="button"
                className="mb-2 flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                onClick={() => toggleFolder(group.folder)}
                aria-expanded={isExpanded(group.folder)}
              >
                <span>{group.folder.split("/").join(" / ")}</span>
                <span className="text-slate-400">
                  {isExpanded(group.folder) ? "▼" : "▶"}
                </span>
              </button>
            )}
            {isExpanded(group.folder) && (
              <div className="grid grid-cols-2 gap-3">
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-600 transition hover:border-sky-300 hover:text-slate-900"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt={item.name} className="h-8 w-8" />
                    </div>
                    <span className="text-center font-medium">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
