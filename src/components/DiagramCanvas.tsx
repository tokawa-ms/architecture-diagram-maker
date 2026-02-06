"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DiagramElement, DiagramLinePoint } from "@/lib/types";

interface DiagramCanvasProps {
  elements: DiagramElement[];
  selectedIds: string[];
  emptyMessage: string;
  showGrid: boolean;
  disableElementInteractions?: boolean;
  interactionMode?: "edit" | "draw";
  activeTool?: {
    type: DiagramElement["type"];
    style?: "solid" | "dashed";
    arrowEnds?: "end" | "both";
    lineMode?: "straight" | "polyline";
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
    points?: DiagramLinePoint[];
    lineMode?: "straight" | "polyline";
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
  onCanvasContextMenu?: (args: { clientX: number; clientY: number }) => void;
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
  pickTopElementId,
  onSelectIds,
  onOpenContextMenuForId,
  onUpdate,
  onOpenContextMenu,
  selectedIds,
  onMoveSelection,
  selectionIdsForDrag,
  onInteractionStart,
  onInteractionEnd,
  disableElementInteractions,
}: {
  element: Extract<DiagramElement, { type: "arrow" | "line" }>;
  selected: boolean;
  onSelect: () => void;
  pickTopElementId?: (clientX: number, clientY: number) => string | null;
  onSelectIds: (ids: string[]) => void;
  onOpenContextMenuForId?: (elementId: string, clientX: number, clientY: number) => void;
  onUpdate: (updates: Partial<DiagramElement>) => void;
  onOpenContextMenu?: (args: { clientX: number; clientY: number }) => void;
  selectedIds: string[];
  onMoveSelection?: (args: { ids: string[]; deltaX: number; deltaY: number }) => void;
  selectionIdsForDrag: string[];
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  disableElementInteractions?: boolean;
}) => {
  const getLinePoints = (target: typeof element): DiagramLinePoint[] => {
    if (Array.isArray(target.points) && target.points.length >= 2) {
      return target.points;
    }
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
    return [
      { x: startX, y: startY },
      { x: endX, y: endY },
    ];
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
    points?: DiagramLinePoint[];
  }>(null);

  const [dragCorner, setDragCorner] = useState<null | {
    index: number;
    offsetX: number;
    offsetY: number;
    points: DiagramLinePoint[];
  }>(null);

  const [dragLine, setDragLine] = useState<null | {
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startEndX: number;
    startEndY: number;
    points?: DiagramLinePoint[];
  }>(null);

  const [groupDrag, setGroupDrag] = useState<null | {
    ids: string[];
    lastClientX: number;
    lastClientY: number;
  }>(null);

  const linePoints = getLinePoints(element);
  const startPointAbs = linePoints[0];
  const endPointAbs = linePoints[linePoints.length - 1];
  const xs = linePoints.map((point) => point.x);
  const ys = linePoints.map((point) => point.y);
  const minXAbs = Math.min(...xs);
  const maxXAbs = Math.max(...xs);
  const minYAbs = Math.min(...ys);
  const maxYAbs = Math.max(...ys);
  const boxWidth = Math.max(maxXAbs - minXAbs, 10);
  const boxHeight = Math.max(maxYAbs - minYAbs, 10);
  const relativePoints = linePoints.map((point) => ({
    x: point.x - minXAbs,
    y: point.y - minYAbs,
  }));

  useEffect(() => {
    if (!dragHandle) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextXAbs = event.clientX - dragHandle.offsetX;
      const nextYAbs = event.clientY - dragHandle.offsetY;

      if (dragHandle.points && dragHandle.points.length >= 2) {
        const updated = [...dragHandle.points];
        const index = dragHandle.which === "start" ? 0 : updated.length - 1;
        updated[index] = { x: nextXAbs, y: nextYAbs };
        onUpdate({ points: updated, startX: updated[0].x, startY: updated[0].y });
        return;
      }

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
    if (!dragCorner) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextXAbs = event.clientX - dragCorner.offsetX;
      const nextYAbs = event.clientY - dragCorner.offsetY;
      const updated = [...dragCorner.points];
      if (updated.length < 2) return;
      updated[dragCorner.index] = { x: nextXAbs, y: nextYAbs };
      onUpdate({
        points: updated,
        startX: updated[0].x,
        startY: updated[0].y,
        endX: updated[updated.length - 1].x,
        endY: updated[updated.length - 1].y,
      });
    };

    const handlePointerUp = () => {
      setDragCorner(null);
      onInteractionEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragCorner, onUpdate]);

  useEffect(() => {
    if (!dragLine) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - dragLine.startClientX;
      const dy = event.clientY - dragLine.startClientY;
      if (dragLine.points && dragLine.points.length >= 2) {
        const nextPoints = dragLine.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        }));
        onUpdate({ points: nextPoints });
        return;
      }
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
      setGroupDrag({
        ids: groupDrag.ids,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      });
      onMoveSelection?.({ ids: groupDrag.ids, deltaX: dx, deltaY: dy });
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
  }, [groupDrag, onMoveSelection]);

  const startDragEndpoint = (
    which: "start" | "end",
    event: React.PointerEvent<SVGCircleElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onInteractionStart?.();

    const pointXAbs = which === "start" ? startPointAbs.x : endPointAbs.x;
    const pointYAbs = which === "start" ? startPointAbs.y : endPointAbs.y;

    setDragHandle({
      which,
      offsetX: event.clientX - pointXAbs,
      offsetY: event.clientY - pointYAbs,
      fixedStartX: startPointAbs.x,
      fixedStartY: startPointAbs.y,
      fixedEndX: endPointAbs.x,
      fixedEndY: endPointAbs.y,
      points: linePoints,
    });
  };

  const startDragCorner = (
    index: number,
    event: React.PointerEvent<SVGCircleElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onInteractionStart?.();

    const point = linePoints[index];
    if (!point) return;
    setDragCorner({
      index,
      offsetX: event.clientX - point.x,
      offsetY: event.clientY - point.y,
      points: linePoints,
    });
  };

  const hitStrokeWidth = Math.max(10, element.strokeWidth + 10);
  const isMultiSelected = selectionIdsForDrag.length > 1;
  const trySelectOverlappingElement = (event: React.PointerEvent) => {
    const topMostId = pickTopElementId?.(event.clientX, event.clientY) ?? null;
    if (topMostId && topMostId !== element.id) {
      onSelectIds([topMostId]);
      return topMostId;
    }
    return null;
  };

  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      style={{
        left: minXAbs,
        top: minYAbs,
        width: boxWidth,
        height: boxHeight,
        opacity: element.opacity,
        zIndex: selected ? element.zIndex + 10000 : element.zIndex,
      }}
      data-diagram-id={element.id}
      data-diagram-type={element.type}
      data-diagram-z={element.zIndex}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const topMostId = pickTopElementId?.(event.clientX, event.clientY) ?? null;
        if (topMostId && topMostId !== element.id) {
          onOpenContextMenuForId?.(topMostId, event.clientX, event.clientY);
          return;
        }
        onSelect();
        onOpenContextMenu?.({ clientX: event.clientX, clientY: event.clientY });
      }}
    >
      <polyline
        points={relativePoints.map((point) => `${point.x},${point.y}`).join(" ")}
        stroke="transparent"
        strokeWidth={hitStrokeWidth}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        fill="none"
        pointerEvents="stroke"
        className={
          selected && !disableElementInteractions ? "cursor-move" : "cursor-default"
        }
        onPointerDown={(event) => {
          if (disableElementInteractions) return;
          event.preventDefault();
          event.stopPropagation();
          const passThroughId = selected ? null : trySelectOverlappingElement(event);
          if (passThroughId) {
            if (event.button !== 0) return;
            onInteractionStart?.();
            setDragHandle(null);
            setDragLine(null);
            setGroupDrag({
              ids: [passThroughId],
              lastClientX: event.clientX,
              lastClientY: event.clientY,
            });
            return;
          }
          onSelect();
          onInteractionStart?.();
          if (event.button !== 0) return;
          setDragHandle(null);
          if (isMultiSelected) {
            setDragLine(null);
            setGroupDrag({
              ids: selectionIdsForDrag,
              lastClientX: event.clientX,
              lastClientY: event.clientY,
            });
            return;
          }
          setDragLine({
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: startPointAbs.x,
            startY: startPointAbs.y,
            startEndX: endPointAbs.x,
            startEndY: endPointAbs.y,
            points: linePoints,
          });
        }}
      />
      <polyline
        points={relativePoints.map((point) => `${point.x},${point.y}`).join(" ")}
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
        fill="none"
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

      {selected && !disableElementInteractions && (
        <>
          <circle
            cx={relativePoints[0].x}
            cy={relativePoints[0].y}
            r={6}
            fill="white"
            stroke="#38BDF8"
            strokeWidth={2}
            pointerEvents="all"
            onPointerDown={(event) => {
              if (disableElementInteractions) return;
              startDragEndpoint("start", event);
            }}
          />
          {relativePoints.slice(1, -1).map((point, index) => (
            <circle
              key={`corner-${element.id}-${index}`}
              cx={point.x}
              cy={point.y}
              r={5}
              fill="white"
              stroke="#38BDF8"
              strokeWidth={2}
              pointerEvents="all"
              onPointerDown={(event) => {
                if (disableElementInteractions) return;
                startDragCorner(index + 1, event);
              }}
            />
          ))}
          <circle
            cx={relativePoints[relativePoints.length - 1].x}
            cy={relativePoints[relativePoints.length - 1].y}
            r={6}
            fill="white"
            stroke="#38BDF8"
            strokeWidth={2}
            pointerEvents="all"
            onPointerDown={(event) => {
              if (disableElementInteractions) return;
              startDragEndpoint("end", event);
            }}
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
  pickTopElementId,
  onSelectIds,
  onUpdate,
  onOpenContextMenu,
  children,
  selectedIds,
  onMoveSelection,
  selectionIdsForDrag,
  onInteractionStart,
  onInteractionEnd,
  disableElementInteractions,
}: {
  element: DiagramElement;
  selected: boolean;
  onSelect: () => void;
  pickTopElementId?: (clientX: number, clientY: number) => string | null;
  onSelectIds: (ids: string[]) => void;
  onUpdate: (updates: Partial<DiagramElement>) => void;
  onOpenContextMenu?: (args: { clientX: number; clientY: number }) => void;
  children: React.ReactNode;
  selectedIds: string[];
  onMoveSelection?: (args: { ids: string[]; deltaX: number; deltaY: number }) => void;
  selectionIdsForDrag: string[];
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  disableElementInteractions?: boolean;
}) => {
  const [dragging, setDragging] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [groupDrag, setGroupDrag] = useState<null | {
    ids: string[];
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

  const trySelectTopMost = (event: React.PointerEvent) => {
    const topMostId = pickTopElementId?.(event.clientX, event.clientY) ?? null;
    if (topMostId && topMostId !== element.id) {
      onSelectIds([topMostId]);
      return topMostId;
    }
    return null;
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (disableElementInteractions) return;
    event.preventDefault();
    event.stopPropagation();
    const passThroughId = trySelectTopMost(event);
    if (passThroughId) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      onInteractionStart?.();
      setGroupDrag({
        ids: [passThroughId],
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      });
      return;
    }
    onSelect();
    onInteractionStart?.();

    // Only start dragging for primary button.
    // (Right click is used for the context menu.)
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    if (selectionIdsForDrag.length > 1) {
      setGroupDrag({
        ids: selectionIdsForDrag,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      });
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
      setGroupDrag({
        ids: groupDrag.ids,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      });
      onMoveSelection?.({ ids: groupDrag.ids, deltaX: dx, deltaY: dy });
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
    !disableElementInteractions &&
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
    if (disableElementInteractions) return;
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
      className={`absolute border-2 border-dashed ${
        selected ? "border-sky-400" : "border-transparent"
      } ${selected && !disableElementInteractions ? "cursor-move" : "cursor-default"}`}
      style={{
        ...getElementStyle(element),
      }}
      data-diagram-id={element.id}
      data-diagram-type={element.type}
      data-diagram-z={element.zIndex}
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
  interactionMode = "edit",
  previewLabels,
  onSelect,
  onUpdate,
  onCreateElement,
  onInteractionStart,
  onInteractionEnd,
  onMoveSelection,
  onOpenContextMenu,
  disableElementInteractions,
  onCanvasContextMenu,
}: DiagramCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const allowElementInteractions = interactionMode === "edit" && !disableElementInteractions;
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
  const lockPointToAxis = (
    anchor: DiagramLinePoint,
    next: DiagramLinePoint,
  ): DiagramLinePoint => {
    const dx = Math.abs(next.x - anchor.x);
    const dy = Math.abs(next.y - anchor.y);
    if (dx >= dy) {
      return { x: next.x, y: anchor.y };
    }
    return { x: anchor.x, y: next.y };
  };
  const finalizePolylineAt = (
    event: React.MouseEvent<HTMLDivElement>,
    draft: NonNullable<typeof polylineDraft>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    const snappedPoint = {
      x: snapValue(endX),
      y: snapValue(endY),
    };
    const last = draft.points[draft.points.length - 1];
    const nextPoint = isPolylineMode && last
      ? lockPointToAxis(last, snappedPoint)
      : snappedPoint;
    const distance = Math.hypot(
      nextPoint.x - last.x,
      nextPoint.y - last.y,
    );
    const nextPoints =
      distance < gridSize ? draft.points : [...draft.points, nextPoint];

    if (nextPoints.length < 2 || !activeTool) {
      setPolylineDraftState(null);
      return;
    }

    const first = nextPoints[0];
    const end = nextPoints[nextPoints.length - 1];
    onCreateElement?.({
      type: activeTool.type,
      style: activeTool.style,
      arrowEnds: activeTool.arrowEnds,
      lineMode: activeTool.lineMode,
      startX: first.x,
      startY: first.y,
      endX: end.x,
      endY: end.y,
      points: nextPoints,
    });
    setPolylineDraftState(null);
  };
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
  const [polylineDraft, setPolylineDraft] = useState<null | {
    points: DiagramLinePoint[];
    current: DiagramLinePoint;
    isDragging: boolean;
    pendingFinalize: boolean;
  }>(null);
  const polylineDraftRef = useRef<typeof polylineDraft>(null);

  const setPolylineDraftState = (
    next:
      | typeof polylineDraft
      | ((prev: typeof polylineDraft) => typeof polylineDraft),
  ) => {
    setPolylineDraft((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      polylineDraftRef.current = resolved;
      return resolved;
    });
  };

  useEffect(() => {
    polylineDraftRef.current = polylineDraft;
  }, [polylineDraft]);

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

  const previewPolylinePoints = polylineDraft
    ? (() => {
        const base = polylineDraft.points;
        if (polylineDraft.pendingFinalize) {
          return base;
        }
        return [...base, polylineDraft.current];
      })()
    : null;

  const isPolylineMode =
    activeTool &&
    (activeTool.type === "arrow" || activeTool.type === "line") &&
    activeTool.lineMode === "polyline";

  useEffect(() => {
    if (!isPolylineMode) {
      setPolylineDraft(null);
    }
  }, [isPolylineMode]);

  const getGroupSelectionIds = (element: DiagramElement) => {
    if (!element.groupId) return [element.id];
    return elements
      .filter((item) => item.groupId === element.groupId)
      .map((item) => item.id);
  };

  const getLinePointsForElement = (
    element: Extract<DiagramElement, { type: "arrow" | "line" }>,
  ): DiagramLinePoint[] => {
    if (Array.isArray(element.points) && element.points.length >= 2) {
      return element.points;
    }
    return [
      { x: element.startX, y: element.startY },
      { x: element.endX, y: element.endY },
    ];
  };

  const distanceToSegmentSquared = (
    point: DiagramLinePoint,
    a: DiagramLinePoint,
    b: DiagramLinePoint,
  ) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      const px = point.x - a.x;
      const py = point.y - a.y;
      return px * px + py * py;
    }
    const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const closestX = a.x + clamped * dx;
    const closestY = a.y + clamped * dy;
    const px = point.x - closestX;
    const py = point.y - closestY;
    return px * px + py * py;
  };

  const isPointNearLine = (
    point: DiagramLinePoint,
    element: Extract<DiagramElement, { type: "arrow" | "line" }>,
  ) => {
    const points = getLinePointsForElement(element);
    const threshold = Math.max(5, (element.strokeWidth + 10) / 2);
    const thresholdSq = threshold * threshold;
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      if (distanceToSegmentSquared(point, a, b) <= thresholdSq) {
        return true;
      }
    }
    return false;
  };

  const pickTopElementId = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let topMost: DiagramElement | null = null;
    let topMostIndex = -1;
    const point = { x, y };
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      let hit = false;
      if (element.type === "line" || element.type === "arrow") {
        hit = isPointNearLine(point, element);
      } else {
        const bounds = getElementBounds(element);
        hit =
          x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
      }
      if (!hit) continue;
      if (!topMost || element.zIndex > topMost.zIndex) {
        topMost = element;
        topMostIndex = index;
        continue;
      }
      if (topMost && element.zIndex === topMost.zIndex && index > topMostIndex) {
        topMost = element;
        topMostIndex = index;
      }
    }
    return topMost?.id ?? null;
  };
  const openContextMenuForId = (
    elementId: string,
    clientX: number,
    clientY: number,
  ) => {
    onOpenContextMenu?.({ elementId, clientX, clientY });
  };

  return (
    <div
      id="diagram-canvas-root"
      className="relative isolate z-0 h-full min-h-[520px] w-full rounded-2xl border border-dashed border-slate-300 bg-white shadow-inner"
      ref={canvasRef}
      style={{
        backgroundImage: showGrid
          ? "linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)"
          : "none",
        backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : undefined,
        backgroundPosition: showGrid ? "0 0" : undefined,
      }}
      onPointerDownCapture={(event) => {
        if (interactionMode !== "edit" || activeTool) return;
        if (event.button !== 0) return;
        const topMostId = pickTopElementId(event.clientX, event.clientY);
        if (topMostId) {
          onSelect([topMostId]);
        }
      }}
      onContextMenu={(event) => {
        const isCanvasTarget = event.target === event.currentTarget;
        if (!isCanvasTarget) return;
        event.preventDefault();
        event.stopPropagation();
        onCanvasContextMenu?.({ clientX: event.clientX, clientY: event.clientY });
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const isCanvasTarget = event.target === event.currentTarget;
        if (!isCanvasTarget && !activeTool) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        if (interactionMode === "draw" && activeTool && isPolylineMode) {
          event.currentTarget.setPointerCapture(event.pointerId);
          onSelect([]);
          setSelectionBox(null);
          setDrawState(null);
          const snappedPoint = {
            x: snapValue(startX),
            y: snapValue(startY),
          };
          setPolylineDraftState((prev) => {
            if (!prev) {
              return {
                points: [snappedPoint],
                current: snappedPoint,
                isDragging: true,
                pendingFinalize: false,
              };
            }

            if (!prev.isDragging) {
              const last = prev.points[prev.points.length - 1];
              const distance = Math.hypot(
                snappedPoint.x - last.x,
                snappedPoint.y - last.y,
              );
              if (distance <= gridSize) {
                return {
                  ...prev,
                  current: last,
                  pendingFinalize: true,
                  isDragging: false,
                };
              }
              return {
                ...prev,
                current: snappedPoint,
                isDragging: true,
                pendingFinalize: false,
              };
            }

            return prev;
          });
          return;
        }
        if (interactionMode === "draw" && activeTool) {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDrawState({ startX, startY, currentX: startX, currentY: startY });
          onSelect([]);
          return;
        }
        if (interactionMode !== "edit") return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
        onSelect([]);
      }}
      onPointerMove={(event) => {
        if (polylineDraftRef.current) {
          const rect = event.currentTarget.getBoundingClientRect();
          const currentX = event.clientX - rect.left;
          const currentY = event.clientY - rect.top;
          setPolylineDraftState((prev) => {
            if (!prev || prev.pendingFinalize) return prev;
            const snapped = {
              x: snapValue(currentX),
              y: snapValue(currentY),
            };
            const last = prev.points[prev.points.length - 1];
            const currentPoint = isPolylineMode && last
              ? lockPointToAxis(last, snapped)
              : snapped;
            return { ...prev, current: currentPoint };
          });
          return;
        }
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
        const activeDraft = polylineDraftRef.current;
        if (activeDraft && isPolylineMode) {
          if (activeDraft.isDragging) {
            const rect = event.currentTarget.getBoundingClientRect();
            const endX = event.clientX - rect.left;
            const endY = event.clientY - rect.top;
            const snappedPoint = {
              x: snapValue(endX),
              y: snapValue(endY),
            };
            setPolylineDraftState((prev) => {
              if (!prev) return prev;
              const last = prev.points[prev.points.length - 1];
              const nextPoint = isPolylineMode && last
                ? lockPointToAxis(last, snappedPoint)
                : snappedPoint;
              const distance = Math.hypot(
                nextPoint.x - last.x,
                nextPoint.y - last.y,
              );
              if (distance < gridSize) {
                return {
                  ...prev,
                  current: last,
                  isDragging: false,
                  pendingFinalize: false,
                };
              }
              return {
                points: [...prev.points, nextPoint],
                current: nextPoint,
                isDragging: false,
                pendingFinalize: false,
              };
            });
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
              // no-op
            }
            return;
          }

          if (activeDraft.pendingFinalize && activeDraft.points.length >= 2) {
            const rect = event.currentTarget.getBoundingClientRect();
            const endX = event.clientX - rect.left;
            const endY = event.clientY - rect.top;
            const last = activeDraft.points[activeDraft.points.length - 1];
            const distance = Math.hypot(endX - last.x, endY - last.y);
            if (distance <= gridSize) {
              const first = activeDraft.points[0];
              onCreateElement?.({
                type: activeTool.type,
                style: activeTool.style,
                arrowEnds: activeTool.arrowEnds,
                lineMode: activeTool.lineMode,
                startX: first.x,
                startY: first.y,
                endX: last.x,
                endY: last.y,
                points: activeDraft.points,
              });
              setPolylineDraftState(null);
              try {
                event.currentTarget.releasePointerCapture(event.pointerId);
              } catch {
                // no-op
              }
              return;
            }
            setPolylineDraftState((prev) =>
              prev ? { ...prev, pendingFinalize: false } : prev,
            );
          }
        }
        if (interactionMode === "draw" && drawState && activeTool) {
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
            lineMode: activeTool.lineMode,
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
      onDoubleClick={(event) => {
        if (interactionMode !== "draw" || !isPolylineMode) return;
        const activeDraft = polylineDraftRef.current;
        if (!activeDraft || !activeTool) return;
        event.preventDefault();
        event.stopPropagation();
        finalizePolylineAt(event, activeDraft);
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // no-op
        }
      }}
      onPointerCancel={() => {
        setSelectionBox(null);
        setDrawState(null);
        setPolylineDraftState(null);
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
          style={{ ...selectionBoxStyle, zIndex: 10000 }}
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
          style={{ left: 0, top: 0, width: "100%", height: "100%", zIndex: 50 }}
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
      {previewPolylinePoints && previewPolylinePoints.length >= 2 && (
        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          style={{ left: 0, top: 0, width: "100%", height: "100%", zIndex: 50 }}
        >
          {(activeTool?.type === "arrow") && (
            <defs>
              <marker
                id="preview-polyline-arrowhead"
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
          <polyline
            points={previewPolylinePoints
              .map((point) => `${point.x},${point.y}`)
              .join(" ")}
            stroke={activeTool?.type === "arrow" ? "#0F172A" : "#64748B"}
            strokeWidth={2}
            strokeDasharray={activeTool?.style === "dashed" ? "6 4" : "0"}
            markerEnd={
              activeTool?.type === "arrow" &&
              (activeTool.arrowEnds === "end" || activeTool.arrowEnds === "both")
                ? "url(#preview-polyline-arrowhead)"
                : undefined
            }
            markerStart={
              activeTool?.type === "arrow" && activeTool.arrowEnds === "both"
                ? "url(#preview-polyline-arrowhead)"
                : undefined
            }
            strokeLinecap="round"
            fill="none"
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
              pickTopElementId={pickTopElementId}
              onSelectIds={onSelect}
              onOpenContextMenuForId={openContextMenuForId}
              onUpdate={(updates) => onUpdate(element.id, updates)}
              onOpenContextMenu={(args) =>
                onOpenContextMenu?.({ elementId: element.id, ...args })
              }
              selectedIds={selectedIds}
              onMoveSelection={onMoveSelection}
              selectionIdsForDrag={selectionIdsForDrag}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
              disableElementInteractions={!allowElementInteractions}
            />
          );
        }

        return (
          <Draggable
            key={element.id}
            element={element}
            selected={selectedIds.includes(element.id)}
            onSelect={() => onSelect(selectionIdsForDrag)}
            pickTopElementId={pickTopElementId}
            onSelectIds={onSelect}
            onUpdate={(updates) => onUpdate(element.id, updates)}
            onOpenContextMenu={(args) =>
              onOpenContextMenu?.({ elementId: element.id, ...args })
            }
            selectedIds={selectedIds}
            onMoveSelection={onMoveSelection}
            selectionIdsForDrag={selectionIdsForDrag}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
            disableElementInteractions={!allowElementInteractions}
          >
            {element.type === "icon" && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={element.src}
                    alt={element.label ?? "icon"}
                    className="h-10 w-10 object-contain"
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
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
