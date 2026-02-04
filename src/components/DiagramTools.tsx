"use client";

import type { ArrowEnds, ArrowStyle, DiagramElement, DiagramElementType } from "@/lib/types";

interface DiagramToolsProps {
  labels: {
    title: string;
    toolBox: string;
    toolText: string;
    toolLineSolid: string;
    toolLineDashed: string;
    toolArrowSolidSingle: string;
    toolArrowDashedSingle: string;
    toolArrowSolidDouble: string;
    toolArrowDashedDouble: string;
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
  onAddElement: (
    type: DiagramElementType,
    style?: ArrowStyle,
    arrowEnds?: ArrowEnds,
  ) => void;
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
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("line", "solid")}
          >
            {labels.toolLineSolid}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("line", "dashed")}
          >
            {labels.toolLineDashed}
          </button>

          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("arrow", "solid", "end")}
          >
            {labels.toolArrowSolidSingle}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("arrow", "dashed", "end")}
          >
            {labels.toolArrowDashedSingle}
          </button>

          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("arrow", "solid", "both")}
          >
            {labels.toolArrowSolidDouble}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900"
            onClick={() => onAddElement("arrow", "dashed", "both")}
          >
            {labels.toolArrowDashedDouble}
          </button>
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
