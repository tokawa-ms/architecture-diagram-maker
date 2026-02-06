"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLanguage } from "@/components/useLanguage";
import { getMessages } from "@/lib/i18n";

interface IconItem {
  id: string;
  name: string;
  src: string;
  folder?: string;
}

type IconsApiResponse = {
  items: IconItem[];
};

export default function ItemsPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<IconItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/icons", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load icons: ${response.status}`);
        }
        const data = (await response.json()) as IconsApiResponse;
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setLoadError(false);
        }
      } catch (error) {
        console.error("Failed to fetch icons", error);
        if (!cancelled) {
          setItems([]);
          setLoadError(true);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      const name = item.name.toLowerCase();
      const folder = (item.folder ?? "").toLowerCase();
      return name.includes(q) || folder.includes(q);
    });
  }, [items, query]);

  const groups = useMemo(() => {
    const byFolder = new Map<string, IconItem[]>();
    for (const item of filtered) {
      const folder = item.folder ?? "";
      const list = byFolder.get(folder) ?? [];
      list.push(item);
      byFolder.set(folder, list);
    }

    const sortedFolders = [...byFolder.keys()].sort((a, b) =>
      a.localeCompare(b),
    );
    return sortedFolders.map((folder) => {
      const list = byFolder.get(folder) ?? [];
      list.sort((a, b) => a.name.localeCompare(b.name));
      return { folder, items: list };
    });
  }, [filtered]);

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
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="search"
                  placeholder={messages.panelPaletteSearch}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 sm:max-w-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={messages.panelPaletteSearch}
                />
                <p className="text-xs text-slate-400">{messages.paletteHint}</p>
              </div>
              {loadError && (
                <p className="text-xs text-rose-500">
                  {messages.paletteEmpty}
                </p>
              )}
              {!loadError && filtered.length === 0 && (
                <p className="text-center text-xs text-slate-400">
                  {messages.paletteEmpty}
                </p>
              )}
              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group.folder || "__root"}>
                    {group.folder && (
                      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>{group.folder.split("/").join(" / ")}</span>
                        <span>{group.items.length}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 sm:grid-cols-3">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.src}
                              alt={item.name}
                              className="h-6 w-6"
                            />
                          </div>
                          <span className="font-medium text-slate-700">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />
    </div>
  );
}
