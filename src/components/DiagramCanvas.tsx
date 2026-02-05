"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiagramElement } from "@/lib/types";

interface DiagramCanvasProps {
  elements: DiagramElement[];
  selectedId: string | null;
  emptyMessage: string;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<DiagramElement>) => void;
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
}: {
  element: Extract<DiagramElement, { type: "arrow" | "line" }>;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DiagramElement>) => void;
  onOpenContextMenu?: (args: { clientX: number; clientY: number }) => void;
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
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragLine, onUpdate]);

  const startDragEndpoint = (
    which: "start" | "end",
    event: React.PointerEvent<SVGCircleElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();

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
          if (event.button !== 0) return;
          setDragHandle(null);
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
}: {
  element: DiagramElement;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DiagramElement>) => void;
  onOpenContextMenu?: (args: { clientX: number; clientY: number }) => void;
  children: React.ReactNode;
}) => {
  const [dragging, setDragging] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
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

    // Only start dragging for primary button.
    // (Right click is used for the context menu.)
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setOrigin({ x: event.clientX - element.x, y: event.clientY - element.y });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!dragging) return;
    onUpdate({ x: event.clientX - origin.x, y: event.clientY - origin.y });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
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
  selectedId,
  emptyMessage,
  onSelect,
  onUpdate,
  onOpenContextMenu,
}: DiagramCanvasProps) {
  return (
    <div
      id="diagram-canvas-root"
      className="relative isolate z-0 h-[520px] w-full rounded-2xl border border-dashed border-slate-300 bg-white shadow-inner"
      onPointerDown={() => onSelect(null)}
    >
      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          {emptyMessage}
        </div>
      )}
      {elements.map((element) => {
        if (element.type === "arrow" || element.type === "line") {
          return (
            <Arrow
              key={element.id}
              element={element}
              selected={selectedId === element.id}
              onSelect={() => onSelect(element.id)}
              onUpdate={(updates) => onUpdate(element.id, updates)}
              onOpenContextMenu={(args) =>
                onOpenContextMenu?.({ elementId: element.id, ...args })
              }
            />
          );
        }

        return (
          <Draggable
            key={element.id}
            element={element}
            selected={selectedId === element.id}
            onSelect={() => onSelect(element.id)}
            onUpdate={(updates) => onUpdate(element.id, updates)}
            onOpenContextMenu={(args) =>
              onOpenContextMenu?.({ elementId: element.id, ...args })
            }
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
