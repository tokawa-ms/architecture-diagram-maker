"use client";

import { useMemo, useState } from "react";
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
}: {
  element: Extract<DiagramElement, { type: "arrow" | "line" }>;
}) => {
  const strokeDasharray = useMemo(() => {
    if (element.style === "dashed") {
      return "6 4";
    }
    if (element.style === "dotted") {
      return "2 4";
    }
    return "0";
  }, [element.style]);

  const arrowHead = element.type === "arrow";
  const markerId = `arrowhead-${element.id}`;

  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      style={{
        left: element.x,
        top: element.y,
        width: Math.max(element.width, 10),
        height: Math.max(element.height, 10),
        opacity: element.opacity,
        zIndex: element.zIndex,
      }}
    >
      <line
        x1={0}
        y1={0}
        x2={element.width}
        y2={element.height}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={arrowHead ? `url(#${markerId})` : undefined}
      />
      {arrowHead && (
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="7"
            refX="8"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={element.stroke}
            />
          </marker>
        </defs>
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

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    setDragging(true);
    setOrigin({ x: event.clientX - element.x, y: event.clientY - element.y });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!dragging) return;
    onUpdate({ x: event.clientX - origin.x, y: event.clientY - origin.y });
  };

  const handlePointerUp = () => {
    setDragging(false);
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
      onPointerLeave={handlePointerUp}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        onOpenContextMenu?.({ clientX: event.clientX, clientY: event.clientY });
      }}
    >
      {children}
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
      className="relative h-[520px] w-full rounded-2xl border border-dashed border-slate-300 bg-white shadow-inner"
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
            <div
              key={element.id}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(element.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelect(element.id);
                onOpenContextMenu?.({
                  elementId: element.id,
                  clientX: event.clientX,
                  clientY: event.clientY,
                });
              }}
            >
              <Arrow element={element} />
            </div>
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
