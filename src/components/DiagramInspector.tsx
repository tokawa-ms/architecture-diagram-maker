"use client";

import type { DiagramElement } from "@/lib/types";

interface DiagramInspectorProps {
  selected: DiagramElement | null;
  selectionCount?: number;
  showTitle?: boolean;
  labels: {
    title: string;
    hint: string;
    noSelection: string;
    multiSelection: string;
    propertyName: string;
    propertyFill: string;
    propertyBorder: string;
    propertyText: string;
    propertySize: string;
    propertyWidth: string;
    propertyHeight: string;
    propertyOpacity: string;
    propertyStroke: string;
    propertyStrokeWidth: string;
    propertyFontSize: string;
    propertyRadius: string;
    propertyArrowStyle: string;
    propertyStartX: string;
    propertyStartY: string;
    propertyEndX: string;
    propertyEndY: string;
  };
  onUpdate: (updates: Partial<DiagramElement>) => void;
}

const NumberInput = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) => (
  <label className="flex flex-col gap-1 text-xs text-slate-500">
    <span className="font-medium text-slate-700">{label}</span>
    <input
      type="number"
      className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const TextInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-1 text-xs text-slate-500">
    <span className="font-medium text-slate-700">{label}</span>
    <input
      type="text"
      className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-1 text-xs text-slate-500">
    <span className="font-medium text-slate-700">{label}</span>
    <input
      type="color"
      className="h-9 w-full rounded-md border border-slate-200"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

export default function DiagramInspector({
  selected,
  selectionCount,
  showTitle = true,
  labels,
  onUpdate,
}: DiagramInspectorProps) {
  if (!selected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        {showTitle && (
          <p className="font-semibold text-slate-700">{labels.title}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {selectionCount && selectionCount > 1
            ? labels.multiSelection
            : labels.noSelection}
        </p>
        <p className="mt-4 text-xs text-slate-400">{labels.hint}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      {showTitle && (
        <p className="font-semibold text-slate-900">{labels.title}</p>
      )}
      <div className="mt-3 grid gap-3">
        {(selected.type === "icon" || selected.type === "box") && (
          <TextInput
            label={labels.propertyName}
            value={"label" in selected && selected.label ? selected.label : ""}
            onChange={(value) => onUpdate({ label: value })}
          />
        )}
        {selected.type === "text" && (
          <TextInput
            label={labels.propertyText}
            value={selected.text}
            onChange={(value) => onUpdate({ text: value })}
          />
        )}
        {selected.type === "box" && (
          <div className="grid gap-3">
            <ColorInput
              label={labels.propertyFill}
              value={selected.fill}
              onChange={(value) => onUpdate({ fill: value })}
            />
            <ColorInput
              label={labels.propertyBorder}
              value={selected.border}
              onChange={(value) => onUpdate({ border: value })}
            />
            <NumberInput
              label={labels.propertyRadius}
              value={selected.radius}
              min={0}
              max={48}
              onChange={(value) => onUpdate({ radius: value })}
            />
          </div>
        )}
        {selected.type === "text" && (
          <div className="grid gap-3">
            <ColorInput
              label={labels.propertyText}
              value={selected.color}
              onChange={(value) => onUpdate({ color: value })}
            />
            <NumberInput
              label={labels.propertyFontSize}
              value={selected.fontSize}
              min={10}
              max={48}
              onChange={(value) => onUpdate({ fontSize: value })}
            />
          </div>
        )}
        {(selected.type === "arrow" || selected.type === "line") && (
          <div className="grid gap-3">
            <ColorInput
              label={labels.propertyStroke}
              value={selected.stroke}
              onChange={(value) => onUpdate({ stroke: value })}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label={labels.propertyOpacity}
            value={selected.opacity}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(value) => onUpdate({ opacity: value })}
          />
          {(selected.type === "arrow" || selected.type === "line") ? (
            <>
              <NumberInput
                label={labels.propertyStrokeWidth}
                value={selected.strokeWidth}
                min={1}
                max={8}
                onChange={(value) => onUpdate({ strokeWidth: value })}
              />
              <NumberInput
                label={labels.propertyStartX}
                value={selected.startX}
                onChange={(value) => onUpdate({ startX: value })}
              />
              <NumberInput
                label={labels.propertyStartY}
                value={selected.startY}
                onChange={(value) => onUpdate({ startY: value })}
              />
              <NumberInput
                label={labels.propertyEndX}
                value={selected.endX}
                onChange={(value) => onUpdate({ endX: value })}
              />
              <NumberInput
                label={labels.propertyEndY}
                value={selected.endY}
                onChange={(value) => onUpdate({ endY: value })}
              />
            </>
          ) : (
            <>
              <NumberInput
                label={labels.propertyWidth}
                value={selected.width}
                min={20}
                max={600}
                onChange={(value) => onUpdate({ width: value })}
              />
              <NumberInput
                label={labels.propertyHeight}
                value={selected.height}
                min={20}
                max={600}
                onChange={(value) => onUpdate({ height: value })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
