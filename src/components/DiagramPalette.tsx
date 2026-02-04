"use client";

import { useMemo, useState } from "react";

interface PaletteItem {
  id: string;
  name: string;
  src: string;
}

interface DiagramPaletteProps {
  title: string;
  searchLabel: string;
  hint: string;
  emptyLabel: string;
  onSelect: (item: PaletteItem) => void;
}

const paletteItems: PaletteItem[] = [
  { id: "azure", name: "Azure", src: "/icons/azure.svg" },
  { id: "entra", name: "Entra", src: "/icons/entra.svg" },
  { id: "apim", name: "API Management", src: "/icons/api-management.svg" },
  { id: "logic", name: "Logic Apps", src: "/icons/logic-apps.svg" },
  { id: "storage", name: "Storage", src: "/icons/storage.svg" },
];

export default function DiagramPalette({
  title,
  searchLabel,
  hint,
  emptyLabel,
  onSelect,
}: DiagramPaletteProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return paletteItems;
    return paletteItems.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
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
      <div className="mt-4 grid grid-cols-2 gap-3">
        {filtered.length === 0 && (
          <p className="col-span-2 text-center text-xs text-slate-400">
            {emptyLabel}
          </p>
        )}
        {filtered.map((item) => (
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
            <span className="text-center font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
