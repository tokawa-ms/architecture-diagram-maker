"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiagramElement } from "@/lib/types";

interface DiagramCanvasProps {
  elements: DiagramElement[];
  selectedIds: string[];
  emptyMessage: string;
  showGrid: boolean;
  activeTool?: {
    type: DiagramElement["type"];
    style?: "solid" | "dashed";
    arrowEnds?: "end" | "both";
  } | null;
  previewLabels?: {
    box: string;
    text: string;
  };
  onSelect: (ids: string[]) => void;
  onUpdate: (id: string, updates: Partial<DiagramElement>) => void;
  onCreateElement?: (args: {
    type: DiagramElement["type"];
    style?: "solid" | "dashed";
    arrowEnds?: "end" | "both";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onMoveSelection?: (args: {
    ids: string[];
    deltaX: number;
    deltaY: number;
  }) => void;
  onOpenContextMenu?: (args: {
    elementId: string;
    clientX: number;
    clientY: number;
  }) => void;
}

const getElementStyle = (element: DiagramElement) => {
  const base: React.CSSProperties = {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    opacity: element.opacity,
    zIndex: element.zIndex,
  };

  if (element.type === "box") {
    return {
      ...base,
      backgroundColor: element.fill,
      border: `${element.borderWidth}px solid ${element.border}`,
      borderRadius: element.radius,
    };
  }

  if (element.type === "text") {
    return {
      ...base,
      color: element.color,
      fontSize: element.fontSize,
      lineHeight: 1.3,
    };
  }

  return base;
};

const Arrow = ({
  element,
  selected,
  onSelect,
  onUpdate,
  onOpenContextMenu,
  selectedIds,
  onMoveSelection,
  selectionIdsForDrag,
  onInteractionStart,
  onInteractionEnd,
}: {
  element: Extract<DiagramElement, { type: "arrow" | "line" }>;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DiagramElement>) => void;
  onOpenContextMenu?: (args: { clientX: number; clientY: number }) => void;
  selectedIds: string[];
  onMoveSelection?: (args: { ids: string[]; deltaX: number; deltaY: number }) => void;
  selectionIdsForDrag: string[];
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) => {
  const getLinePoints = (target: typeof element) => {
    const startX =
      "startX" in target && typeof target.startX === "number"
        ? target.startX
        : target.x;
    const startY =
      "startY" in target && typeof target.startY === "number"
        ? target.startY
        : target.y;
    const endX =
      "endX" in target && typeof target.endX === "number"
        ? target.endX
        : target.x + target.width;
    const endY =
      "endY" in target && typeof target.endY === "number"
        ? target.endY
        : target.y + target.height;
    return { startX, startY, endX, endY };
  };

  const strokeDasharray = useMemo(() => {
    const style = (element as unknown as { style?: string }).style;
    if (style === "dashed") {
      return "6 4";
    }
    if (style === "dotted") {
      return "2 4";
    }
    return "0";
  }, [element]);

  const arrowHead = element.type === "arrow";
  const markerId = `arrowhead-${element.id}`;
  const arrowEnds = arrowHead
    ? ((element as unknown as { arrowEnds?: "end" | "both" }).arrowEnds ?? "end")
    : "end";

  const [dragHandle, setDragHandle] = useState<null | {
    which: "start" | "end";
    offsetX: number;
    offsetY: number;
    fixedStartX: number;
    fixedStartY: number;
    fixedEndX: number;
    fixedEndY: number;
  }>(null);

  const [dragLine, setDragLine] = useState<null | {
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startEndX: number;
    startEndY: number;
  }>(null);

  const [groupDrag, setGroupDrag] = useState<null | {
    lastClientX: number;
    lastClientY: number;
  }>(null);

  const points = getLinePoints(element);
  const startXAbs = points.startX;
  const startYAbs = points.startY;
  const endXAbs = points.endX;
  const endYAbs = points.endY;

  const minXAbs = Math.min(startXAbs, endXAbs);
  const minYAbs = Math.min(startYAbs, endYAbs);
  const boxWidth = Math.max(Math.abs(endXAbs - startXAbs), 10);
  const boxHeight = Math.max(Math.abs(endYAbs - startYAbs), 10);

  const startX = startXAbs - minXAbs;
  const startY = startYAbs - minYAbs;
  const endX = endXAbs - minXAbs;
  const endY = endYAbs - minYAbs;

  useEffect(() => {
    if (!dragHandle) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextXAbs = event.clientX - dragHandle.offsetX;
      const nextYAbs = event.clientY - dragHandle.offsetY;

      if (dragHandle.which === "start") {
        onUpdate({
          startX: nextXAbs,
          startY: nextYAbs,
          endX: dragHandle.fixedEndX,
          endY: dragHandle.fixedEndY,
        });
        return;
      }

      onUpdate({
        startX: dragHandle.fixedStartX,
        startY: dragHandle.fixedStartY,
        endX: nextXAbs,
        endY: nextYAbs,
      });
    };

    const handlePointerUp = () => {
      setDragHandle(null);
      onInteractionEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragHandle, onUpdate]);

  useEffect(() => {
    if (!dragLine) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - dragLine.startClientX;
      const dy = event.clientY - dragLine.startClientY;
      onUpdate({
        startX: dragLine.startX + dx,
        startY: dragLine.startY + dy,
        endX: dragLine.startEndX + dx,
        endY: dragLine.startEndY + dy,
      });
    };

    const handlePointerUp = () => {
      setDragLine(null);
      onInteractionEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragLine, onUpdate]);

  useEffect(() => {
    if (!groupDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - groupDrag.lastClientX;
      const dy = event.clientY - groupDrag.lastClientY;
      if (dx === 0 && dy === 0) return;
      setGroupDrag({ lastClientX: event.clientX, lastClientY: event.clientY });
      onMoveSelection?.({ ids: selectionIdsForDrag, deltaX: dx, deltaY: dy });
    };

    const handlePointerUp = () => {
      setGroupDrag(null);
      onInteractionEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [groupDrag, onMoveSelection, selectionIdsForDrag]);

  const startDragEndpoint = (
    which: "start" | "end",
    event: React.PointerEvent<SVGCircleElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onInteractionStart?.();

    const pointXAbs = which === "start" ? startXAbs : endXAbs;
    const pointYAbs = which === "start" ? startYAbs : endYAbs;

    setDragHandle({
      which,
      offsetX: event.clientX - pointXAbs,
      offsetY: event.clientY - pointYAbs,
      fixedStartX: startXAbs,
      fixedStartY: startYAbs,
      fixedEndX: endXAbs,
      fixedEndY: endYAbs,
    });
  };

  const hitStrokeWidth = Math.max(16, element.strokeWidth * 8);
  const isMultiSelected = selectionIdsForDrag.length > 1;

  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      style={{
        left: minXAbs,
        top: minYAbs,
        width: boxWidth,
        height: boxHeight,
        opacity: element.opacity,
        zIndex: element.zIndex,
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        onOpenContextMenu?.({ clientX: event.clientX, clientY: event.clientY });
      }}
    >
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="transparent"
        strokeWidth={hitStrokeWidth}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        pointerEvents="stroke"
        className="cursor-move"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect();
          onInteractionStart?.();
          if (event.button !== 0) return;
          setDragHandle(null);
          if (isMultiSelected) {
            setDragLine(null);
            setGroupDrag({
              lastClientX: event.clientX,
              lastClientY: event.clientY,
            });
            return;
          }
          setDragLine({
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: startXAbs,
            startY: startYAbs,
            startEndX: endXAbs,
            startEndY: endYAbs,
          });
        }}
      />
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={
          arrowHead && (arrowEnds === "end" || arrowEnds === "both")
            ? `url(#${markerId})`
            : undefined
        }
        markerStart={arrowHead && arrowEnds === "both" ? `url(#${markerId})` : undefined}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {arrowHead && (
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="7"
            refX="8"
            refY="3.5"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={element.stroke}
            />
          </marker>
        </defs>
      )}

      {selected && (
        <>
          <circle
            cx={startX}
            cy={startY}
            r={6}
            fill="white"
            stroke="#38BDF8"
            strokeWidth={2}
            pointerEvents="all"
            onPointerDown={(event) => startDragEndpoint("start", event)}
          />
          <circle
            cx={endX}
            cy={endY}
            r={6}
            fill="white"
            stroke="#38BDF8"
            strokeWidth={2}
            pointerEvents="all"
            onPointerDown={(event) => startDragEndpoint("end", event)}
          />
        </>
      )}
    </svg>
  );
};

const Draggable = ({
  element,
  selected,
  onSelect,
  onUpdate,
  onOpenContextMenu,
  children,
  selectedIds,
  onMoveSelection,
  selectionIdsForDrag,
  onInteractionStart,
  onInteractionEnd,
}: {
  element: DiagramElement;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DiagramElement>) => void;
  onOpenContextMenu?: (args: { clientX: number; clientY: number }) => void;
  children: React.ReactNode;
  selectedIds: string[];
  onMoveSelection?: (args: { ids: string[]; deltaX: number; deltaY: number }) => void;
  selectionIdsForDrag: string[];
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) => {
  const [dragging, setDragging] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [groupDrag, setGroupDrag] = useState<null | {
    lastClientX: number;
    lastClientY: number;
  }>(null);
  const [resizeState, setResizeState] = useState<null | {
    handle: "nw" | "ne" | "sw" | "se";
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>(null);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onInteractionStart?.();

    // Only start dragging for primary button.
    // (Right click is used for the context menu.)
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    if (selectionIdsForDrag.length > 1) {
      setGroupDrag({ lastClientX: event.clientX, lastClientY: event.clientY });
      return;
    }
    setDragging(true);
    setOrigin({ x: event.clientX - element.x, y: event.clientY - element.y });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (groupDrag) {
      const dx = event.clientX - groupDrag.lastClientX;
      const dy = event.clientY - groupDrag.lastClientY;
      if (dx === 0 && dy === 0) return;
      setGroupDrag({ lastClientX: event.clientX, lastClientY: event.clientY });
      onMoveSelection?.({ ids: selectionIdsForDrag, deltaX: dx, deltaY: dy });
      return;
    }
    if (!dragging) return;
    onUpdate({ x: event.clientX - origin.x, y: event.clientY - origin.y });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    setGroupDrag(null);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
    onInteractionEnd?.();
  };

  const isResizable =
    selected &&
    (element.type === "box" || element.type === "text" || element.type === "icon");

  useEffect(() => {
    if (!resizeState) return;

    const minSize = 20;

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - resizeState.startClientX;
      const dy = event.clientY - resizeState.startClientY;

      const west = resizeState.handle === "nw" || resizeState.handle === "sw";
      const north = resizeState.handle === "nw" || resizeState.handle === "ne";
      const east = resizeState.handle === "ne" || resizeState.handle === "se";
      const south = resizeState.handle === "sw" || resizeState.handle === "se";

      const nextWidthRaw = west
        ? resizeState.startWidth - dx
        : east
          ? resizeState.startWidth + dx
          : resizeState.startWidth;
      const nextHeightRaw = north
        ? resizeState.startHeight - dy
        : south
          ? resizeState.startHeight + dy
          : resizeState.startHeight;

      const nextWidth = Math.max(minSize, nextWidthRaw);
      const nextHeight = Math.max(minSize, nextHeightRaw);

      const nextX = west
        ? resizeState.startX + (resizeState.startWidth - nextWidth)
        : resizeState.startX;
      const nextY = north
        ? resizeState.startY + (resizeState.startHeight - nextHeight)
        : resizeState.startY;

      onUpdate({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });
    };

    const handlePointerUp = () => {
      setResizeState(null);
      onInteractionEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onUpdate, resizeState]);

  const startResize = (
    handle: "nw" | "ne" | "sw" | "se",
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onInteractionStart?.();
    setDragging(false);
    setResizeState({
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
      startWidth: element.width,
      startHeight: element.height,
    });
  };

  return (
    <div
      className={`absolute cursor-move border-2 border-dashed ${
        selected ? "border-sky-400" : "border-transparent"
      }`}
      style={getElementStyle(element)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        onOpenContextMenu?.({ clientX: event.clientX, clientY: event.clientY });
      }}
    >
      {children}

      {isResizable && (
        <>
          <div
            role="button"
            tabIndex={-1}
            aria-label="resize north west"
            className="absolute -left-2 -top-2 h-3 w-3 cursor-nwse-resize rounded-sm border border-sky-400 bg-white"
            onPointerDown={(event) => startResize("nw", event)}
          />
          <div
            role="button"
            tabIndex={-1}
            aria-label="resize north east"
            className="absolute -right-2 -top-2 h-3 w-3 cursor-nesw-resize rounded-sm border border-sky-400 bg-white"
            onPointerDown={(event) => startResize("ne", event)}
          />
          <div
            role="button"
            tabIndex={-1}
            aria-label="resize south west"
            className="absolute -left-2 -bottom-2 h-3 w-3 cursor-nesw-resize rounded-sm border border-sky-400 bg-white"
            onPointerDown={(event) => startResize("sw", event)}
          />
          <div
            role="button"
            tabIndex={-1}
            aria-label="resize south east"
            className="absolute -right-2 -bottom-2 h-3 w-3 cursor-nwse-resize rounded-sm border border-sky-400 bg-white"
            onPointerDown={(event) => startResize("se", event)}
          />
        </>
      )}
    </div>
  );
};

export default function DiagramCanvas({
  elements,
  selectedIds,
  emptyMessage,
  showGrid,
  activeTool,
  previewLabels,
  onSelect,
  onUpdate,
  onCreateElement,
  onInteractionStart,
  onInteractionEnd,
  onMoveSelection,
  onOpenContextMenu,
}: DiagramCanvasProps) {
  const gridSize = 10;
  const snapValue = (value: number) => Math.round(value / gridSize) * gridSize;
  const snapLinePoints = (args: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }) => ({
    startX: snapValue(args.startX),
    startY: snapValue(args.startY),
    endX: snapValue(args.endX),
    endY: snapValue(args.endY),
  });
  const snapRectPoints = (args: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }) => {
    const startX = snapValue(args.startX);
    const startY = snapValue(args.startY);
    const endX = snapValue(args.endX);
    const endY = snapValue(args.endY);
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.max(gridSize * 2, Math.abs(endX - startX));
    const height = Math.max(gridSize * 2, Math.abs(endY - startY));
    return { x, y, width, height, startX, startY, endX, endY };
  };
  const [selectionBox, setSelectionBox] = useState<null | {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>(null);
  const [drawState, setDrawState] = useState<null | {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>(null);

  const getElementBounds = (element: DiagramElement) => {
    const minX = Math.min(element.x, element.x + element.width);
    const maxX = Math.max(element.x, element.x + element.width);
    const minY = Math.min(element.y, element.y + element.height);
    const maxY = Math.max(element.y, element.y + element.height);
    return { minX, minY, maxX, maxY };
  };

  const getSelectionBoxStyle = () => {
    if (!selectionBox) return null;
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    return { left, top, width, height };
  };

  const selectionBoxStyle = getSelectionBoxStyle();
  const previewRect =
    drawState && activeTool && activeTool.type !== "arrow" && activeTool.type !== "line"
      ? snapRectPoints({
          startX: drawState.startX,
          startY: drawState.startY,
          endX: drawState.currentX,
          endY: drawState.currentY,
        })
      : null;
  const previewLine =
    drawState && activeTool && (activeTool.type === "arrow" || activeTool.type === "line")
      ? snapLinePoints({
          startX: drawState.startX,
          startY: drawState.startY,
          endX: drawState.currentX,
          endY: drawState.currentY,
        })
      : null;

  const getGroupSelectionIds = (element: DiagramElement) => {
    if (!element.groupId) return [element.id];
    return elements
      .filter((item) => item.groupId === element.groupId)
      .map((item) => item.id);
  };

  return (
    <div
      id="diagram-canvas-root"
      className="relative isolate z-0 h-full min-h-[520px] w-full rounded-2xl border border-dashed border-slate-300 bg-white shadow-inner"
      style={{
        backgroundImage: showGrid
          ? "linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)"
          : "none",
        backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : undefined,
        backgroundPosition: showGrid ? "0 0" : undefined,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        if (activeTool) {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDrawState({ startX, startY, currentX: startX, currentY: startY });
          onSelect([]);
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
        onSelect([]);
      }}
      onPointerMove={(event) => {
        if (drawState) {
          const rect = event.currentTarget.getBoundingClientRect();
          const currentX = event.clientX - rect.left;
          const currentY = event.clientY - rect.top;
          setDrawState((prev) =>
            prev ? { ...prev, currentX, currentY } : prev,
          );
          return;
        }
        if (!selectionBox) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        setSelectionBox((prev) =>
          prev ? { ...prev, currentX, currentY } : prev,
        );
      }}
      onPointerUp={(event) => {
        if (drawState && activeTool) {
          const rect = event.currentTarget.getBoundingClientRect();
          const endX = event.clientX - rect.left;
          const endY = event.clientY - rect.top;
          const dx = endX - drawState.startX;
          const dy = endY - drawState.startY;
          const minDrag = gridSize;
          if (Math.abs(dx) < minDrag && Math.abs(dy) < minDrag) {
            setDrawState(null);
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
              // no-op
            }
            return;
          }
          onCreateElement?.({
            type: activeTool.type,
            style: activeTool.style,
            arrowEnds: activeTool.arrowEnds,
            startX: drawState.startX,
            startY: drawState.startY,
            endX,
            endY,
          });
          setDrawState(null);
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // no-op
          }
          return;
        }
        if (!selectionBox) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        const left = Math.min(selectionBox.startX, currentX);
        const top = Math.min(selectionBox.startY, currentY);
        const right = Math.max(selectionBox.startX, currentX);
        const bottom = Math.max(selectionBox.startY, currentY);

        const nextSelected = elements
          .filter((element) => {
            const bounds = getElementBounds(element);
            const intersects =
              bounds.maxX >= left &&
              bounds.minX <= right &&
              bounds.maxY >= top &&
              bounds.minY <= bottom;
            return intersects;
          })
          .map((element) => element.id);

        onSelect(nextSelected);
        setSelectionBox(null);
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // no-op
        }
      }}
      onPointerCancel={() => {
        setSelectionBox(null);
        setDrawState(null);
      }}
    >
      {elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          {emptyMessage}
        </div>
      )}
      {selectionBoxStyle && (
        <div
          className="pointer-events-none absolute border border-sky-400 bg-sky-100/40"
          style={selectionBoxStyle}
        />
      )}
      {previewRect && activeTool?.type === "box" && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: previewRect.x,
            top: previewRect.y,
            width: previewRect.width,
            height: previewRect.height,
            backgroundColor: "#F8FAFC",
            border: "2px solid #CBD5F5",
            borderRadius: 12,
          }}
        >
          {previewLabels?.box && (
            <div className="p-2 text-xs font-semibold text-slate-700">
              {previewLabels.box}
            </div>
          )}
        </div>
      )}
      {previewRect && activeTool?.type === "text" && (
        <div
          className="pointer-events-none absolute flex items-center justify-center"
          style={{
            left: previewRect.x,
            top: previewRect.y,
            width: previewRect.width,
            height: previewRect.height,
            color: "#0F172A",
            fontSize: 16,
            lineHeight: 1.3,
          }}
        >
          {previewLabels?.text ?? ""}
        </div>
      )}
      {previewLine && (
        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          style={{ left: 0, top: 0, width: "100%", height: "100%" }}
        >
          {(activeTool?.type === "arrow") && (
            <defs>
              <marker
                id="preview-arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="8"
                refY="3.5"
                orient="auto-start-reverse"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#0F172A"
                />
              </marker>
            </defs>
          )}
          <line
            x1={previewLine.startX}
            y1={previewLine.startY}
            x2={previewLine.endX}
            y2={previewLine.endY}
            stroke={activeTool?.type === "arrow" ? "#0F172A" : "#64748B"}
            strokeWidth={2}
            strokeDasharray={activeTool?.style === "dashed" ? "6 4" : "0"}
            markerEnd={
              activeTool?.type === "arrow" &&
              (activeTool.arrowEnds === "end" || activeTool.arrowEnds === "both")
                ? "url(#preview-arrowhead)"
                : undefined
            }
            markerStart={
              activeTool?.type === "arrow" && activeTool.arrowEnds === "both"
                ? "url(#preview-arrowhead)"
                : undefined
            }
            strokeLinecap="round"
          />
        </svg>
      )}
      {elements.map((element) => {
        const selectionIdsForDrag =
          selectedIds.length > 1 && selectedIds.includes(element.id)
            ? selectedIds
            : getGroupSelectionIds(element);
        if (element.type === "arrow" || element.type === "line") {
          return (
            <Arrow
              key={element.id}
              element={element}
              selected={selectedIds.includes(element.id)}
              onSelect={() => onSelect(selectionIdsForDrag)}
              onUpdate={(updates) => onUpdate(element.id, updates)}
              onOpenContextMenu={(args) =>
                onOpenContextMenu?.({ elementId: element.id, ...args })
              }
              selectedIds={selectedIds}
              onMoveSelection={onMoveSelection}
              selectionIdsForDrag={selectionIdsForDrag}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
            />
          );
        }

        return (
          <Draggable
            key={element.id}
            element={element}
            selected={selectedIds.includes(element.id)}
            onSelect={() => onSelect(selectionIdsForDrag)}
            onUpdate={(updates) => onUpdate(element.id, updates)}
            onOpenContextMenu={(args) =>
              onOpenContextMenu?.({ elementId: element.id, ...args })
            }
            selectedIds={selectedIds}
            onMoveSelection={onMoveSelection}
            selectionIdsForDrag={selectionIdsForDrag}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
          >
            {element.type === "icon" && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={element.src}
                    alt={element.label ?? "icon"}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                {element.label && (
                  <span className="text-xs font-medium text-slate-700">
                    {element.label}
                  </span>
                )}
              </div>
            )}
            {element.type === "box" && (
              <div className="flex h-full w-full items-start justify-start p-2">
                {element.label && (
                  <span className="text-xs font-semibold text-slate-700">
                    {element.label}
                  </span>
                )}
              </div>
            )}
            {element.type === "text" && (
              <div className="flex h-full w-full items-center justify-center">
                {element.text}
              </div>
            )}
          </Draggable>
        );
      })}
    </div>
  );
}
