"use client";

import { useRef } from "react";

import type {
  ArrowEnds,
  ArrowStyle,
  DiagramElement,
  DiagramElementType,
} from "@/lib/types";

interface DiagramToolsProps {
  variant?: "sidebar" | "toolbar";
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
    toolCanvasMenu: string;
    toolExportMenu: string;
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
  activeTool?: {
    type: DiagramElementType;
    style?: ArrowStyle;
    arrowEnds?: ArrowEnds;
  } | null;
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
  variant = "sidebar",
  labels,
  activeTool,
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
  const baseButtonClass =
    "rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-slate-900";
  const activeButtonClass =
    "border-sky-400 bg-sky-50 text-sky-700";
  const menuItemClass =
    "block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50";

  const exportDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const canvasDetailsRef = useRef<HTMLDetailsElement | null>(null);

  const closeMenu = (ref: { current: HTMLDetailsElement | null }) => {
    ref.current?.removeAttribute("open");
  };

  const summaryClass =
    `${baseButtonClass} cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden`;

  const isActive = (
    type: DiagramElementType,
    style?: ArrowStyle,
    arrowEnds?: ArrowEnds,
  ) =>
    !!activeTool &&
    activeTool.type === type &&
    activeTool.style === style &&
    activeTool.arrowEnds === arrowEnds;

  // Note: bring-front / send-back are intentionally not exposed here;
  // they are available via the canvas context menu.
  void onBringFront;
  void onSendBack;

  if (variant === "toolbar") {
    return (
      <div className="relative z-10 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("box") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("box")}
          >
            {labels.toolBox}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("text") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("text")}
          >
            {labels.toolText}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("line", "solid") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("line", "solid")}
          >
            {labels.toolLineSolid}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("line", "dashed") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("line", "dashed")}
          >
            {labels.toolLineDashed}
          </button>

          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "solid", "end") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "solid", "end")}
          >
            {labels.toolArrowSolidSingle}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "dashed", "end") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "dashed", "end")}
          >
            {labels.toolArrowDashedSingle}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "solid", "both") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "solid", "both")}
          >
            {labels.toolArrowSolidDouble}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "dashed", "both") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "dashed", "both")}
          >
            {labels.toolArrowDashedDouble}
          </button>

          <details ref={exportDetailsRef} className="relative">
            <summary className={summaryClass}>{labels.toolExportMenu}</summary>
            <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  onExportPng();
                  closeMenu(exportDetailsRef);
                }}
              >
                {labels.toolExport}
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  onExportJson();
                  closeMenu(exportDetailsRef);
                }}
              >
                {labels.toolExportJson}
              </button>
            </div>
          </details>

          <details ref={canvasDetailsRef} className="relative">
            <summary className={summaryClass}>{labels.toolCanvasMenu}</summary>
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                className={`${menuItemClass} text-rose-600`}
                onClick={() => {
                  onClear();
                  closeMenu(canvasDetailsRef);
                }}
              >
                {labels.toolClear}
              </button>
              <button
                type="button"
                className={`${menuItemClass} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  onDuplicate();
                  closeMenu(canvasDetailsRef);
                }}
                disabled={!selected}
              >
                {labels.toolDuplicate}
              </button>
              <button
                type="button"
                className={`${menuItemClass} text-rose-600 disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  onDelete();
                  closeMenu(canvasDetailsRef);
                }}
                disabled={!selected}
              >
                {labels.toolDelete}
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  onLoadSample();
                  closeMenu(canvasDetailsRef);
                }}
              >
                {labels.loadSample}
              </button>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900">{labels.title}</p>
      </div>
      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("box") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("box")}
          >
            {labels.toolBox}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("text") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("text")}
          >
            {labels.toolText}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("line", "solid") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("line", "solid")}
          >
            {labels.toolLineSolid}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("line", "dashed") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("line", "dashed")}
          >
            {labels.toolLineDashed}
          </button>

          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "solid", "end") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "solid", "end")}
          >
            {labels.toolArrowSolidSingle}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "dashed", "end") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "dashed", "end")}
          >
            {labels.toolArrowDashedSingle}
          </button>

          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "solid", "both") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "solid", "both")}
          >
            {labels.toolArrowSolidDouble}
          </button>
          <button
            type="button"
            className={`${baseButtonClass} ${
              isActive("arrow", "dashed", "both") ? activeButtonClass : ""
            }`}
            onClick={() => onAddElement("arrow", "dashed", "both")}
          >
            {labels.toolArrowDashedDouble}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <details className="relative">
            <summary className={summaryClass}>{labels.toolExportMenu}</summary>
            <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" className={menuItemClass} onClick={onExportPng}>
                {labels.toolExport}
              </button>
              <button type="button" className={menuItemClass} onClick={onExportJson}>
                {labels.toolExportJson}
              </button>
            </div>
          </details>

          <details className="relative">
            <summary className={summaryClass}>{labels.toolCanvasMenu}</summary>
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                className={`${menuItemClass} text-rose-600`}
                onClick={onClear}
              >
                {labels.toolClear}
              </button>
              <button
                type="button"
                className={`${menuItemClass} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={onDuplicate}
                disabled={!selected}
              >
                {labels.toolDuplicate}
              </button>
              <button
                type="button"
                className={`${menuItemClass} text-rose-600 disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={onDelete}
                disabled={!selected}
              >
                {labels.toolDelete}
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={onLoadSample}
              >
                {labels.loadSample}
              </button>
            </div>
          </details>
        </div>

        <p className="text-xs text-slate-400">{labels.imageExportHint}</p>
      </div>
    </div>
  );
}
