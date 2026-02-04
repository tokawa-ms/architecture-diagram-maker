"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DiagramCanvas from "@/components/DiagramCanvas";
import DiagramInspector from "@/components/DiagramInspector";
import DiagramPalette from "@/components/DiagramPalette";
import DiagramStoragePanel from "@/components/DiagramStoragePanel";
import DiagramTools from "@/components/DiagramTools";
import { useLanguage } from "@/components/useLanguage";
import { createSampleDiagram } from "@/lib/sample";
import { getMessages } from "@/lib/i18n";
import type {
  ArrowEnds,
  ArrowStyle,
  DiagramElement,
  DiagramElementType,
  DiagramDocument,
} from "@/lib/types";
import { exportDiagramJson, saveDiagram } from "@/lib/storage";

const createEmptyDocument = (name: string): DiagramDocument => {
  const now = new Date().toISOString();
  return {
    id: "draft",
    name,
    createdAt: now,
    updatedAt: now,
    elements: [],
  };
};

const createElement = (
  type: DiagramElementType,
  labels: {
    box: string;
    text: string;
    icon: string;
  },
  style?: ArrowStyle,
  arrowEnds?: ArrowEnds,
): DiagramElement => {
  const base = {
    id: `${type}-${Date.now()}`,
    x: 80,
    y: 80,
    width: 140,
    height: 90,
    rotation: 0,
    zIndex: 1,
    opacity: 1,
  };

  switch (type) {
    case "box":
      return {
        ...base,
        type: "box",
        fill: "#F8FAFC",
        border: "#CBD5F5",
        borderWidth: 2,
        radius: 12,
        label: labels.box,
      };
    case "text":
      return {
        ...base,
        type: "text",
        text: labels.text,
        fontSize: 16,
        color: "#0F172A",
      };
    case "arrow":
      return {
        ...base,
        type: "arrow",
        width: 160,
        height: 0,
        stroke: "#0F172A",
        strokeWidth: 2,
        style: style ?? "solid",
        arrowEnds: arrowEnds ?? "end",
      };
    case "line":
      return {
        ...base,
        type: "line",
        width: 200,
        height: 0,
        stroke: "#64748B",
        strokeWidth: 2,
        style: style ?? "dashed",
      };
    default:
      return {
        ...base,
        type: "icon",
        width: 80,
        height: 80,
        src: "/icons-sample/azure.svg",
        label: labels.icon,
      };
  }
};

const downloadJson = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const loadHtmlToCanvas = async () => {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas;
};

export default function EditorPage() {
  const language = useLanguage();
  const messages = getMessages(language);
  const [diagram, setDiagram] = useState<DiagramDocument>(() =>
    createEmptyDocument(messages.defaultDiagramName),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    elementId: string;
    left: number;
    top: number;
  } | null>(null);
  const navItems = [
    { href: "/", label: messages.navHome },
    { href: "/editor", label: messages.navEditor },
    { href: "/items", label: messages.navItems },
    { href: "/settings", label: messages.navSettings },
    { href: "/about", label: messages.navAbout },
  ];

  const defaultLabels = {
    box: messages.defaultBoxLabel,
    text: messages.defaultTextLabel,
    icon: messages.defaultIconLabel,
  };

  const selectedElement =
    diagram.elements.find((element) => element.id === selectedId) ?? null;

  const inspectorLabels = useMemo(
    () => ({
      title: messages.panelPropertiesTitle,
      hint: messages.inspectorHint,
      noSelection: messages.noSelection,
      propertyName: messages.propertyName,
      propertyFill: messages.propertyFill,
      propertyBorder: messages.propertyBorder,
      propertyText: messages.propertyText,
      propertySize: messages.propertySize,
      propertyWidth: messages.propertyWidth,
      propertyHeight: messages.propertyHeight,
      propertyOpacity: messages.propertyOpacity,
      propertyStroke: messages.propertyStroke,
      propertyStrokeWidth: messages.propertyStrokeWidth,
      propertyFontSize: messages.propertyFontSize,
      propertyRadius: messages.propertyRadius,
      propertyArrowStyle: messages.propertyArrowStyle,
    }),
    [messages],
  );

  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contextMenu]);

  useEffect(() => {
    if (!storageModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStorageModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [storageModalOpen]);


  const updateDocument = (updates: Partial<DiagramDocument>) => {
    setDiagram((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddElement = (
    type: DiagramElementType,
    style?: ArrowStyle,
    ends?: ArrowEnds,
  ) => {
    console.log("Adding element", type);
    const element = createElement(type, defaultLabels, style, ends);
    updateDocument({ elements: [...diagram.elements, element] });
    setSelectedId(element.id);
  };

  const handlePaletteSelect = (item: {
    id: string;
    name: string;
    src: string;
  }) => {
    console.log("Adding icon from palette", item.id);
    const element = createElement("icon", defaultLabels);
    if (element.type !== "icon") return;
    const elementWithIcon: DiagramElement = {
      ...element,
      id: `icon-${item.id}-${Date.now()}`,
      src: item.src,
      label: item.name,
    };
    updateDocument({ elements: [...diagram.elements, elementWithIcon] });
    setSelectedId(elementWithIcon.id);
  };

  const handleUpdateElement = (id: string, updates: Partial<DiagramElement>) => {
    updateDocument({
      elements: diagram.elements.map((element) => {
        if (element.id !== id) {
          return element;
        }
        return { ...element, ...updates } as DiagramElement;
      }),
    });
  };

  const handleClear = () => {
    console.log("Clearing canvas");
    updateDocument({ elements: [] });
    setSelectedId(null);
  };

  const reorderZIndex = (
    elements: DiagramElement[],
    elementId: string,
    direction: "front" | "back",
  ) => {
    const decorated = elements
      .map((element, index) => ({ element, index }))
      .sort((a, b) => {
        const diff = a.element.zIndex - b.element.zIndex;
        return diff !== 0 ? diff : a.index - b.index;
      });

    const currentIndex = decorated.findIndex((item) => item.element.id === elementId);
    if (currentIndex === -1) return elements;

    const [picked] = decorated.splice(currentIndex, 1);
    if (direction === "front") {
      decorated.push(picked);
    } else {
      decorated.unshift(picked);
    }

    const nextZById = new Map(
      decorated.map((item, index) => [item.element.id, index + 1]),
    );

    return elements.map((element) => ({
      ...element,
      zIndex: nextZById.get(element.id) ?? element.zIndex,
    }));
  };

  const handleBringFront = () => {
    if (!selectedElement) return;
    updateDocument({
      elements: reorderZIndex(diagram.elements, selectedElement.id, "front"),
    });
  };

  const handleSendBack = () => {
    if (!selectedElement) return;
    updateDocument({
      elements: reorderZIndex(diagram.elements, selectedElement.id, "back"),
    });
  };

  const handleDuplicate = () => {
    if (!selectedElement) return;
    const duplicated: DiagramElement = {
      ...selectedElement,
      id: `${selectedElement.id}-copy-${Date.now()}`,
      x: selectedElement.x + 20,
      y: selectedElement.y + 20,
      zIndex: selectedElement.zIndex + 1,
    };
    updateDocument({ elements: [...diagram.elements, duplicated] });
  };

  const handleDelete = () => {
    if (!selectedElement) return;
    updateDocument({
      elements: diagram.elements.filter(
        (element) => element.id !== selectedElement.id,
      ),
    });
    setSelectedId(null);
  };

  const handleLoadSample = () => {
    console.log("Loading sample diagram");
    const sample = createSampleDiagram({
      name: messages.sampleName,
      apiGateway: messages.sampleApiGateway,
      apiManagement: messages.sampleApiManagement,
      logicApps: messages.sampleLogicApps,
      publishInterfaces: messages.samplePublishInterfaces,
    });
    setDiagram(sample);
    setSelectedId(sample.elements[0]?.id ?? null);
  };

  const handleSave = () => {
    console.log("Saving diagram to local storage", diagram.id);
    saveDiagram(diagram);
  };

  const handleExportJson = () => {
    console.log("Exporting diagram JSON", diagram.id);
    downloadJson(
      exportDiagramJson(diagram),
      `${diagram.name || "diagram"}.json`,
    );
  };

  const handleExportPng = async () => {
    console.log("Exporting diagram as PNG", diagram.name);
    const canvas = window.document.getElementById("diagram-canvas");
    if (!canvas) return;
    const html2canvas = await loadHtmlToCanvas();
    const result = await html2canvas(canvas as HTMLElement);
    const link = window.document.createElement("a");
    link.download = `${diagram.name || "diagram"}.png`;
    link.href = result.toDataURL("image/png");
    link.click();
  };

  const clampContextMenuPosition = (args: { clientX: number; clientY: number }) => {
    const margin = 10;
    const menuWidth = 360;
    const maxHeightRatio = 0.7;
    const maxLeft = Math.max(margin, window.innerWidth - menuWidth - margin);
    const maxTop = Math.max(
      margin,
      window.innerHeight - window.innerHeight * maxHeightRatio - margin,
    );
    return {
      left: Math.min(Math.max(args.clientX, margin), maxLeft),
      top: Math.min(Math.max(args.clientY, margin), maxTop),
    };
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
      <main className="flex-1 bg-slate-50">
        <section className="mx-[10px] flex flex-col gap-6 px-0 py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">
              {messages.editorTitle}
            </h1>
            <div className="lg:max-w-[calc(100%-220px)]">
              <DiagramTools
                variant="toolbar"
                labels={{
                  title: messages.panelToolsTitle,
                  toolBox: messages.toolBox,
                  toolText: messages.toolText,
                  toolLineSolid: messages.toolLineSolid,
                  toolLineDashed: messages.toolLineDashed,
                  toolArrowSolidSingle: messages.toolArrowSolidSingle,
                  toolArrowDashedSingle: messages.toolArrowDashedSingle,
                  toolArrowSolidDouble: messages.toolArrowSolidDouble,
                  toolArrowDashedDouble: messages.toolArrowDashedDouble,
                  toolClear: messages.toolClear,
                  toolCanvasMenu: messages.toolCanvasMenu,
                  toolExportMenu: messages.toolExportMenu,
                  toolExport: messages.toolExport,
                  toolExportJson: messages.toolExportJson,
                  toolSave: messages.toolSave,
                  toolLoad: messages.toolLoad,
                  toolBringFront: messages.toolBringFront,
                  toolSendBack: messages.toolSendBack,
                  toolDuplicate: messages.toolDuplicate,
                  toolDelete: messages.toolDelete,
                  imageExportHint: messages.imageExportHint,
                  loadSample: messages.loadSample,
                }}
                selected={selectedElement}
                onAddElement={handleAddElement}
                onClear={handleClear}
                onBringFront={handleBringFront}
                onSendBack={handleSendBack}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onExportPng={handleExportPng}
                onExportJson={handleExportJson}
                onLoadSample={handleLoadSample}
              />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-6">
              <DiagramPalette
                title={messages.panelPaletteTitle}
                searchLabel={messages.panelPaletteSearch}
                hint={messages.paletteHint}
                emptyLabel={messages.paletteEmpty}
                onSelect={handlePaletteSelect}
              />
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                onClick={() => {
                  setContextMenu(null);
                  setStorageModalOpen(true);
                }}
              >
                {messages.storageMenuButton}
              </button>
            </div>
            <div className="space-y-4">
              <div id="diagram-canvas">
                <DiagramCanvas
                  elements={[...diagram.elements].sort(
                    (a, b) => a.zIndex - b.zIndex,
                  )}
                  selectedId={selectedId}
                  emptyMessage={messages.canvasEmpty}
                  onSelect={setSelectedId}
                  onUpdate={handleUpdateElement}
                  onOpenContextMenu={(args) => {
                    const position = clampContextMenuPosition(args);
                    setSelectedId(args.elementId);
                    setContextMenu({ elementId: args.elementId, ...position });
                  }}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                {messages.panelStorageHint}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter text={messages.footerText} />

      {storageModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/30 p-[10px]"
          role="dialog"
          aria-modal="true"
          aria-label={messages.storageMenuButton}
          onPointerDown={() => setStorageModalOpen(false)}
        >
          <div className="mx-auto w-full max-w-3xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {messages.storageMenuButton}
                </h2>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                  onClick={() => setStorageModalOpen(false)}
                >
                  {messages.modalClose}
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                <DiagramStoragePanel
                  title={messages.panelStorageTitle}
                  hint={messages.panelStorageHint}
                  labels={{
                    storageKeyLabel: messages.storageKeyLabel,
                    storageSavedAt: messages.storageSavedAt,
                    storageActionLabel: messages.storageActionLabel,
                    storageLoad: messages.storageLoad,
                    storageOverwrite: messages.storageOverwrite,
                    storageNew: messages.storageNew,
                    storageDelete: messages.storageDelete,
                    storageImport: messages.storageImport,
                    storageExport: messages.storageExport,
                    storageCopy: messages.storageCopy,
                    storageCopied: messages.storageCopied,
                    empty: messages.storageEmpty,
                  }}
                  current={diagram}
                  onLoad={(doc) => setDiagram(doc)}
                />
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                  onClick={handleSave}
                >
                  {messages.toolSave}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contextMenu && selectedElement && selectedElement.id === contextMenu.elementId && (
        <div
          className="fixed inset-0 z-50"
          onPointerDown={() => setContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            className="absolute w-[360px] max-h-[70vh] overflow-auto"
            style={{ left: contextMenu.left, top: contextMenu.top }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                onClick={() => {
                  handleBringFront();
                }}
              >
                {messages.toolBringFront}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
                onClick={() => {
                  handleSendBack();
                }}
              >
                {messages.toolSendBack}
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300"
                onClick={() => {
                  handleDelete();
                  setContextMenu(null);
                }}
              >
                {messages.toolDelete}
              </button>
            </div>
            <DiagramInspector
              selected={selectedElement}
              labels={inspectorLabels}
              onUpdate={(updates) => {
                handleUpdateElement(selectedElement.id, updates);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
