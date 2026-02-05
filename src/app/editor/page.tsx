"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  getHistoryLimit,
  HISTORY_LIMIT_STORAGE_KEY,
} from "@/lib/settings";

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
  const [idPrefix, setIdPrefix] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(() => getHistoryLimit());
  const [historyPast, setHistoryPast] = useState<
    Array<{ diagram: DiagramDocument; selectedIds: string[] }>
  >([]);
  const [historyFuture, setHistoryFuture] = useState<
    Array<{ diagram: DiagramDocument; selectedIds: string[] }>
  >([]);
  const historyPastRef = useRef(historyPast);
  const historyFutureRef = useRef(historyFuture);
  const [contextMenu, setContextMenu] = useState<{
    elementIds: string[];
    left: number;
    top: number;
  } | null>(null);
  const diagramRef = useRef(diagram);
  const selectedIdsRef = useRef(selectedIds);
  const historyLimitRef = useRef(historyLimit);
  const isRestoringRef = useRef(false);
  const interactionActiveRef = useRef(false);
  const interactionRecordedRef = useRef(false);
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

  const selectedElements = useMemo(
    () => diagram.elements.filter((element) => selectedIds.includes(element.id)),
    [diagram.elements, selectedIds],
  );
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  const inspectorLabels = useMemo(
    () => ({
      title: messages.panelPropertiesTitle,
      hint: messages.inspectorHint,
      noSelection: messages.noSelection,
      multiSelection: messages.multiSelection,
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

  useEffect(() => {
    diagramRef.current = diagram;
  }, [diagram]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    historyPastRef.current = historyPast;
  }, [historyPast]);

  useEffect(() => {
    historyFutureRef.current = historyFuture;
  }, [historyFuture]);

  useEffect(() => {
    historyLimitRef.current = historyLimit;
    if (historyPastRef.current.length > historyLimit) {
      historyPastRef.current = historyPastRef.current.slice(
        historyPastRef.current.length - historyLimit,
      );
    }
    if (historyFutureRef.current.length > historyLimit) {
      historyFutureRef.current = historyFutureRef.current.slice(0, historyLimit);
    }
    setHistoryPast([...historyPastRef.current]);
    setHistoryFuture([...historyFutureRef.current]);
  }, [historyLimit]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === HISTORY_LIMIT_STORAGE_KEY) {
        setHistoryLimit(getHistoryLimit());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const createSnapshot = useCallback(() => {
    return {
      diagram: diagramRef.current,
      selectedIds: selectedIdsRef.current,
    };
  }, []);

  const runWithoutHistory = (action: () => void) => {
    isRestoringRef.current = true;
    action();
    queueMicrotask(() => {
      isRestoringRef.current = false;
    });
  };

  const commitHistoryState = () => {
    setHistoryPast([...historyPastRef.current]);
    setHistoryFuture([...historyFutureRef.current]);
  };

  const recordHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    const snapshot = createSnapshot();
    const limit = historyLimitRef.current;
    const nextPast = [...historyPastRef.current, snapshot];
    historyPastRef.current =
      nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast;
    historyFutureRef.current = [];
    commitHistoryState();
  }, [createSnapshot]);

  const recordHistoryIfNeeded = useCallback(() => {
    if (isRestoringRef.current) return;
    if (interactionActiveRef.current) return;
    recordHistory();
  }, [recordHistory]);

  const startInteraction = () => {
    if (interactionActiveRef.current) return;
    interactionActiveRef.current = true;
    interactionRecordedRef.current = true;
    recordHistory();
  };

  const endInteraction = () => {
    interactionActiveRef.current = false;
    interactionRecordedRef.current = false;
  };

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    return target.isContentEditable;
  };

  const handleUndo = useCallback(() => {
    const prev = historyPastRef.current;
    if (prev.length === 0) return;
    const snapshot = prev[prev.length - 1];
    historyPastRef.current = prev.slice(0, -1);
    const nextFuture = [createSnapshot(), ...historyFutureRef.current];
    const limit = historyLimitRef.current;
    historyFutureRef.current =
      nextFuture.length > limit ? nextFuture.slice(0, limit) : nextFuture;
    commitHistoryState();
    runWithoutHistory(() => {
      setDiagram(snapshot.diagram);
      setSelectedIds(snapshot.selectedIds);
    });
  }, [createSnapshot]);

  const handleRedo = useCallback(() => {
    const prev = historyFutureRef.current;
    if (prev.length === 0) return;
    const snapshot = prev[0];
    historyFutureRef.current = prev.slice(1);
    const nextPast = [...historyPastRef.current, createSnapshot()];
    const limit = historyLimitRef.current;
    historyPastRef.current =
      nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast;
    commitHistoryState();
    runWithoutHistory(() => {
      setDiagram(snapshot.diagram);
      setSelectedIds(snapshot.selectedIds);
    });
  }, [createSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.repeat) return;
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (key === "y") {
        event.preventDefault();
        if (event.repeat) return;
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRedo, handleUndo]);


  const updateDocument = (updates: Partial<DiagramDocument>) => {
    setDiagram((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateElements = (
    updater: (elements: DiagramElement[]) => DiagramElement[],
  ) => {
    setDiagram((prev) => ({
      ...prev,
      elements: updater(prev.elements),
      updatedAt: new Date().toISOString(),
    }));
  };

  const expandSelectionByGroup = (
    ids: string[],
    elements: DiagramElement[],
  ) => {
    const selected = new Set(ids);
    const groupIds = new Set(
      elements
        .filter((element) => selected.has(element.id) && element.groupId)
        .map((element) => element.groupId as string),
    );

    if (groupIds.size === 0) return Array.from(selected);

    for (const element of elements) {
      if (element.groupId && groupIds.has(element.groupId)) {
        selected.add(element.id);
      }
    }

    return Array.from(selected);
  };

  const resolveSelection = (ids: string[]) => {
    if (ids.length === 1 && selectedIds.includes(ids[0]) && selectedIds.length > 1) {
      return selectedIds;
    }
    return expandSelectionByGroup(ids, diagram.elements);
  };

  const applySelection = (ids: string[]) => {
    setSelectedIds(resolveSelection(ids));
  };

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) =>
        diagram.elements.some((element) => element.id === id),
      );
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [diagram.elements]);

  const handleAddElement = (
    type: DiagramElementType,
    style?: ArrowStyle,
    ends?: ArrowEnds,
  ) => {
    console.log("Adding element", type);
    recordHistory();
    const element = createElement(type, defaultLabels, style, ends);
    updateElements((elements) => [...elements, element]);
    applySelection([element.id]);
  };

  const handlePaletteSelect = (item: {
    id: string;
    name: string;
    src: string;
  }) => {
    console.log("Adding icon from palette", item.id);
    recordHistory();
    const element = createElement("icon", defaultLabels);
    if (element.type !== "icon") return;
    const elementWithIcon: DiagramElement = {
      ...element,
      id: `icon-${item.id}-${Date.now()}`,
      src: item.src,
      label: item.name,
    };
    updateElements((elements) => [...elements, elementWithIcon]);
    applySelection([elementWithIcon.id]);
  };

  const handleUpdateElement = (id: string, updates: Partial<DiagramElement>) => {
    recordHistoryIfNeeded();
    updateElements((elements) =>
      elements.map((element) => {
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
    );
  };

  const handleClear = () => {
    console.log("Clearing canvas");
    recordHistory();
    updateDocument({ elements: [] });
    setSelectedIds([]);
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
    recordHistory();
    updateElements((elements) =>
      reorderZIndex(elements, selectedElement.id, "front"),
    );
  };

  const handleSendBack = () => {
    if (!selectedElement) return;
    recordHistory();
    updateElements((elements) =>
      reorderZIndex(elements, selectedElement.id, "back"),
    );
  };

  const handleDuplicate = () => {
    if (selectedElements.length === 0) return;
    recordHistory();
    const timestamp = Date.now();
    const duplicates = selectedElements.map((element, index) => ({
      ...element,
      id: `${element.id}-copy-${timestamp}-${index}`,
      x: element.x + 20,
      y: element.y + 20,
      zIndex: element.zIndex + 1,
      groupId: undefined,
    }));
    updateElements((elements) => [...elements, ...duplicates]);
    setSelectedIds(duplicates.map((element) => element.id));
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    recordHistory();
    updateElements((elements) =>
      elements.filter((element) => !selectedIds.includes(element.id)),
    );
    setSelectedIds([]);
  };

  const handleMoveSelection = (args: {
    ids: string[];
    deltaX: number;
    deltaY: number;
  }) => {
    const { ids, deltaX, deltaY } = args;
    if (ids.length === 0) return;
    recordHistoryIfNeeded();
    updateElements((elements) =>
      elements.map((element) => {
        if (!ids.includes(element.id)) return element;
        if (element.type === "arrow" || element.type === "line") {
          return {
            ...element,
            startX: element.startX + deltaX,
            startY: element.startY + deltaY,
            endX: element.endX + deltaX,
            endY: element.endY + deltaY,
            x: element.x + deltaX,
            y: element.y + deltaY,
          } as DiagramElement;
        }
        return { ...element, x: element.x + deltaX, y: element.y + deltaY };
      }),
    );
  };

  const handleGroup = () => {
    if (selectedElements.length < 2) return;
    recordHistory();
    const existingGroupIds = selectedElements
      .map((element) => element.groupId)
      .filter((groupId): groupId is string => Boolean(groupId));
    const uniqueGroupIds = new Set(existingGroupIds);
    const groupId =
      existingGroupIds.length === selectedElements.length && uniqueGroupIds.size === 1
        ? existingGroupIds[0]
        : `group-${Date.now()}`;

    updateElements((elements) =>
      elements.map((element) =>
        selectedIds.includes(element.id) ? { ...element, groupId } : element,
      ),
    );
  };

  const handleUngroup = () => {
    const groupIds = new Set(
      selectedElements
        .map((element) => element.groupId)
        .filter((groupId): groupId is string => Boolean(groupId)),
    );
    if (groupIds.size === 0) return;
    recordHistory();
    updateElements((elements) =>
      elements.map((element) =>
        element.groupId && groupIds.has(element.groupId)
          ? { ...element, groupId: undefined }
          : element,
      ),
    );
  };

  const handleLoadSample = () => {
    console.log("Loading sample diagram");
    recordHistory();
    const sample = createSampleDiagram({
      name: messages.sampleName,
      apiGateway: messages.sampleApiGateway,
      apiManagement: messages.sampleApiManagement,
      logicApps: messages.sampleLogicApps,
      publishInterfaces: messages.samplePublishInterfaces,
    });
    setDiagram(sample);
    applySelection(sample.elements[0]?.id ? [sample.elements[0].id] : []);
  };

  const handleSave = async () => {
    console.log("Saving diagram to storage", diagram.id);
    await saveDiagram(diagram);
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

  const canGroup = selectedElements.length >= 2;
  const canUngroup = selectedElements.some((element) => element.groupId);

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
        <section className="mx-[10px] flex flex-1 flex-col gap-6 px-0 py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">
              {messages.editorTitle}
            </h1>
            <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                <label className="text-[11px] font-semibold text-slate-500">
                  {messages.diagramNameLabel}
                </label>
                <input
                  type="text"
                  className="w-[220px] rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                  placeholder={messages.diagramNamePlaceholder}
                  value={diagram.name}
                  onChange={(event) =>
                    updateDocument({ name: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                <label className="text-[11px] font-semibold text-slate-500">
                  {messages.diagramIdPrefixLabel}
                </label>
                <input
                  type="text"
                  className="w-[200px] rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                  placeholder={messages.diagramIdPrefixPlaceholder}
                  value={idPrefix}
                  onChange={(event) => setIdPrefix(event.target.value)}
                />
              </div>
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
          </div>
          <div className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
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
            <div className="flex min-h-0 flex-col">
              <div id="diagram-canvas" className="flex-1">
                <DiagramCanvas
                  elements={[...diagram.elements].sort(
                    (a, b) => a.zIndex - b.zIndex,
                  )}
                  selectedIds={selectedIds}
                  emptyMessage={messages.canvasEmpty}
                  onSelect={(ids) => {
                    applySelection(ids);
                    setContextMenu(null);
                  }}
                  onUpdate={handleUpdateElement}
                  onMoveSelection={handleMoveSelection}
                  onInteractionStart={startInteraction}
                  onInteractionEnd={endInteraction}
                  onOpenContextMenu={(args) => {
                    const position = clampContextMenuPosition(args);
                    const nextSelection = resolveSelection([args.elementId]);
                    setSelectedIds(nextSelection);
                    setContextMenu({ elementIds: nextSelection, ...position });
                  }}
                />
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
                    storageImportFile: messages.storageImportFile,
                    storageExport: messages.storageExport,
                    storageCopy: messages.storageCopy,
                    storageCopied: messages.storageCopied,
                    empty: messages.storageEmpty,
                  }}
                  current={diagram}
                  idPrefix={idPrefix}
                  onLoad={(doc) => {
                    recordHistory();
                    setDiagram(doc);
                  }}
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

      {contextMenu && contextMenu.elementIds.length > 0 && (
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
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  handleBringFront();
                }}
                disabled={!selectedElement}
              >
                {messages.toolBringFront}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  handleSendBack();
                }}
                disabled={!selectedElement}
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
            <div className="mb-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  handleGroup();
                }}
                disabled={!canGroup}
              >
                {messages.toolGroup}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  handleUngroup();
                }}
                disabled={!canUngroup}
              >
                {messages.toolUngroup}
              </button>
            </div>
            <DiagramInspector
              selected={selectedElement}
              labels={inspectorLabels}
              selectionCount={selectedElements.length}
              onUpdate={(updates) => {
                if (!selectedElement) return;
                handleUpdateElement(selectedElement.id, updates);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
