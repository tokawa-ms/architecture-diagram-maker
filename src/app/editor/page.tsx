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
        startX: base.x,
        startY: base.y,
        endX: base.x + 160,
        endY: base.y,
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
        startX: base.x,
        startY: base.y,
        endX: base.x + 200,
        endY: base.y,
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
        if (element.type === "arrow" || element.type === "line") {
          const nextStartX =
            "startX" in updates && typeof updates.startX === "number"
              ? updates.startX
              : "x" in updates && typeof updates.x === "number"
                ? updates.x
              : "startX" in element
                ? element.startX
                : element.x;
          const nextStartY =
            "startY" in updates && typeof updates.startY === "number"
              ? updates.startY
              : "y" in updates && typeof updates.y === "number"
                ? updates.y
              : "startY" in element
                ? element.startY
                : element.y;
          const nextEndX =
            "endX" in updates && typeof updates.endX === "number"
              ? updates.endX
              : "width" in updates && typeof updates.width === "number"
                ? nextStartX + updates.width
              : "endX" in element
                ? element.endX
                : element.x + element.width;
          const nextEndY =
            "endY" in updates && typeof updates.endY === "number"
              ? updates.endY
              : "height" in updates && typeof updates.height === "number"
                ? nextStartY + updates.height
              : "endY" in element
                ? element.endY
                : element.y + element.height;

          const merged = { ...element, ...updates } as DiagramElement;
          return {
            ...merged,
            startX: nextStartX,
            startY: nextStartY,
            endX: nextEndX,
            endY: nextEndY,
            x: nextStartX,
            y: nextStartY,
            width: nextEndX - nextStartX,
            height: nextEndY - nextStartY,
          } as DiagramElement;
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
    const exportTarget =
      window.document.getElementById("diagram-canvas-root") ??
      window.document.getElementById("diagram-canvas");
    if (!exportTarget) return;
    const html2canvas = await loadHtmlToCanvas();
    const hasUnsupportedColorFn = (value: string) =>
      /\boklch\(|\boklab\(|\blch\(|\blab\(|\bcolor-mix\(|\bcolor\(/i.test(value);

    const sanitizeColor = (value: string, propertyName?: string) => {
      if (!value || !hasUnsupportedColorFn(value)) return value;
      const name = (propertyName ?? "").toLowerCase();
      if (name === "color" || name.endsWith("-color") || name.includes("color")) {
        if (name.includes("background")) return "rgba(0, 0, 0, 0)";
        if (name.includes("border")) return "rgba(0, 0, 0, 0)";
        if (name.includes("outline")) return "rgba(0, 0, 0, 0)";
        if (name.includes("caret")) return "rgb(51, 65, 85)";
        if (name.includes("decoration")) return "rgb(51, 65, 85)";
        return "rgb(51, 65, 85)";
      }
      return "rgba(0, 0, 0, 0)";
    };

    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    window.getComputedStyle = ((element: Element, pseudoElt?: string | null) => {
      const style = originalGetComputedStyle(element, pseudoElt as string | null);
      const originalGetPropertyValue = style.getPropertyValue.bind(style);
      return new Proxy(style, {
        get(target, prop, receiver) {
          if (prop === "getPropertyValue") {
            return (name: string) => sanitizeColor(originalGetPropertyValue(name), name);
          }
          // Many CSSStyleDeclaration properties are WebIDL accessors that require
          // the original object as the receiver; using the Proxy as receiver can
          // throw "Illegal invocation".
          const value = Reflect.get(target, prop, target);
          if (typeof value === "function") {
            return value.bind(target);
          }
          if (typeof prop === "string" && typeof value === "string") {
            return sanitizeColor(value, prop);
          }
          return value;
        },
      });
    }) as typeof window.getComputedStyle;

    const exportScale = window.devicePixelRatio || 1;

    const drawArrowhead = (args: {
      ctx: CanvasRenderingContext2D;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      strokeWidth: number;
    }) => {
      const { ctx, fromX, fromY, toX, toY, strokeWidth } = args;

      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) return;

      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;

      // Match DiagramCanvas marker settings:
      // markerWidth=10, markerHeight=7, refX=8, refY=3.5, markerUnits=strokeWidth
      const tipAdvance = 2 * strokeWidth;
      const baseBack = 8 * strokeWidth;
      const halfHeight = 3.5 * strokeWidth;

      const tipX = toX + ux * tipAdvance;
      const tipY = toY + uy * tipAdvance;

      const baseCenterX = toX - ux * baseBack;
      const baseCenterY = toY - uy * baseBack;

      const baseTopX = baseCenterX + px * halfHeight;
      const baseTopY = baseCenterY + py * halfHeight;
      const baseBottomX = baseCenterX - px * halfHeight;
      const baseBottomY = baseCenterY - py * halfHeight;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(baseTopX, baseTopY);
      ctx.lineTo(baseBottomX, baseBottomY);
      ctx.closePath();
      ctx.fill();
    };

    const drawArrowsOnOverlay = (rootEl: HTMLElement) => {
      const overlay = window.document.createElement("canvas");
      overlay.dataset.exportLayer = "arrows";
      overlay.className = "absolute left-0 top-0 pointer-events-none";
      overlay.style.zIndex = "20";

      const cssWidth = rootEl.clientWidth;
      const cssHeight = rootEl.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      overlay.width = Math.max(1, Math.round(cssWidth * dpr));
      overlay.height = Math.max(1, Math.round(cssHeight * dpr));
      overlay.style.width = `${cssWidth}px`;
      overlay.style.height = `${cssHeight}px`;

      rootEl.appendChild(overlay);
      const ctx = overlay.getContext("2d");
      if (!ctx) {
        return () => overlay.remove();
      }

      ctx.scale(dpr, dpr);

      for (const element of diagram.elements) {
        if (element.type !== "arrow" && element.type !== "line") continue;

        const startX =
          "startX" in element && typeof element.startX === "number"
            ? element.startX
            : element.x;
        const startY =
          "startY" in element && typeof element.startY === "number"
            ? element.startY
            : element.y;
        const endX =
          "endX" in element && typeof element.endX === "number"
            ? element.endX
            : element.x + element.width;
        const endY =
          "endY" in element && typeof element.endY === "number"
            ? element.endY
            : element.y + element.height;

        const style = (element as unknown as { style?: string }).style ?? "solid";
        const strokeWidth = Math.max(1, element.strokeWidth);

        ctx.save();
        ctx.globalAlpha = element.opacity;
        ctx.strokeStyle = element.stroke;
        ctx.fillStyle = element.stroke;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";

        if (style === "dashed") ctx.setLineDash([6, 4]);
        else if (style === "dotted") ctx.setLineDash([2, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (element.type === "arrow") {
          const arrowEnds =
            (element as unknown as { arrowEnds?: "end" | "both" }).arrowEnds ?? "end";
          if (arrowEnds === "end" || arrowEnds === "both") {
            drawArrowhead({
              ctx,
              fromX: startX,
              fromY: startY,
              toX: endX,
              toY: endY,
              strokeWidth,
            });
          }
          if (arrowEnds === "both") {
            drawArrowhead({
              ctx,
              fromX: endX,
              fromY: endY,
              toX: startX,
              toY: startY,
              strokeWidth,
            });
          }
        }

        ctx.restore();
      }

      return () => overlay.remove();
    };

    let cleanupOverlay: (() => void) | null = null;

    try {
      let clonedMetrics:
        | {
            width: number;
            height: number;
            borderLeft: number;
            borderTop: number;
          }
        | undefined;

      const canvasRoot = window.document.getElementById("diagram-canvas-root");
      if (canvasRoot) {
        cleanupOverlay = drawArrowsOnOverlay(canvasRoot);
      }

      const result = await html2canvas(exportTarget as HTMLElement, {
        backgroundColor: "#ffffff",
        scale: exportScale,
        useCORS: true,
        onclone: (clonedDocument) => {
          const clonedTarget = clonedDocument.getElementById(
            "diagram-canvas-root",
          ) as HTMLElement | null;
          if (clonedTarget) {
            const rect = clonedTarget.getBoundingClientRect();
            const win = clonedDocument.defaultView;
            const cs = win ? win.getComputedStyle(clonedTarget) : null;
            clonedMetrics = {
              width: rect.width,
              height: rect.height,
              borderLeft: cs ? Number.parseFloat(cs.borderLeftWidth) || 0 : 0,
              borderTop: cs ? Number.parseFloat(cs.borderTopWidth) || 0 : 0,
            };
          }

          clonedDocument.documentElement.style.backgroundColor = "rgb(255, 255, 255)";
          clonedDocument.documentElement.style.colorScheme = "light";
          clonedDocument.body.style.backgroundColor = "rgb(255, 255, 255)";

          const styleTag = clonedDocument.createElement("style");
          styleTag.textContent = `
            #diagram-canvas-root .bg-white { background-color: rgb(255, 255, 255) !important; }
            #diagram-canvas-root .bg-slate-100 { background-color: rgb(241, 245, 249) !important; }
            #diagram-canvas-root .border-slate-300 { border-color: rgb(203, 213, 225) !important; }
            #diagram-canvas-root .border-sky-400 { border-color: rgb(56, 189, 248) !important; }
            #diagram-canvas-root .border-transparent { border-color: transparent !important; }
            #diagram-canvas-root .text-slate-400 { color: rgb(148, 163, 184) !important; }
            #diagram-canvas-root .text-slate-700 { color: rgb(51, 65, 85) !important; }
            #diagram-canvas-root .shadow-inner { box-shadow: none !important; }
            /* Hide SVG arrows/lines during export; we draw them on canvas to match marker sizing reliably. */
            #diagram-canvas-root svg { opacity: 0 !important; }
          `;
          clonedDocument.head.appendChild(styleTag);
        },
      });

      const link = window.document.createElement("a");
      link.download = `${diagram.name || "diagram"}.png`;
      link.href = result.toDataURL("image/png");
      link.click();
    } finally {
      cleanupOverlay?.();
      window.getComputedStyle = originalGetComputedStyle;
    }
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
