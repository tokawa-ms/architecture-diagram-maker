"use client";

import type { ArrowStyle, DiagramElement, DiagramElementType } from "@/lib/types";

interface DiagramToolsProps {
  labels: {
    title: string;
    toolBox: string;
    toolText: string;
    toolArrow: string;
    toolLine: string;
    toolArrowSolid: string;
    toolArrowDashed: string;
    toolArrowDotted: string;
    toolClear: string;
    toolExport: string;
    toolExportJson: string;
    toolSave: string;
    toolLoad: string;
    toolBringFront: string;
    toolSendBack: string;
    toolDuplicate: string;
    toolDelete: string;
    imageExportHint: string;
    loadSample: string;
  };
  selected: DiagramElement | null;
  onAddElement: (type: DiagramElementType, style?: ArrowStyle) => void;
  onClear: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onLoadSample: () => void;
}

export default function DiagramTools({
  labels,
  selected,
  onAddElement,
  onClear,
  onBringFront,
  onSendBack,
  onDuplicate,
  onDelete,
  onExportPng,
  onExportJson,
  onLoadSample,
}: DiagramToolsProps) {
  const arrowButtons: Array<{ style: ArrowStyle; label: string }> = [
    { style: "solid", label: labels.toolArrowSolid },
    { style: "dashed", label: labels.toolArrowDashed },
    { style: "dotted", label: labels.toolArrowDotted },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900">{labels.title}</p>
      </div>
      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("box")}
          >
            {labels.toolBox}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("text")}
          >
            {labels.toolText}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("arrow", "solid")}
          >
            {labels.toolArrow}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("line", "dashed")}
          >
            {labels.toolLine}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {arrowButtons.map((item) => (
            <button
              key={item.style}
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-sky-300 hover:text-slate-900"
              onClick={() => onAddElement("arrow", item.style)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300"
            onClick={onClear}
          >
            {labels.toolClear}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={onExportPng}
          >
            {labels.toolExport}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={onExportJson}
          >
            {labels.toolExportJson}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={onLoadSample}
          >
            {labels.loadSample}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={onBringFront}
            disabled={!selected}
          >
            {labels.toolBringFront}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={onSendBack}
            disabled={!selected}
          >
            {labels.toolSendBack}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={onDuplicate}
            disabled={!selected}
          >
            {labels.toolDuplicate}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300"
            onClick={onDelete}
            disabled={!selected}
          >
            {labels.toolDelete}
          </button>
        </div>
        <p className="text-xs text-slate-400">{labels.imageExportHint}</p>
      </div>
    </div>
  );
}
