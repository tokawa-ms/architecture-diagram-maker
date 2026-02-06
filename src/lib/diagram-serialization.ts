import type { DiagramDocument, DiagramElement, StoredDiagramSummary } from "./types";

const isLineLike = (
  element: DiagramElement,
): element is Extract<DiagramElement, { type: "arrow" | "line" }> =>
  element.type === "arrow" || element.type === "line";

const normalizeLinePoints = (
  element: Extract<DiagramElement, { type: "arrow" | "line" }>,
) => {
  const fallbackX = typeof element.x === "number" ? element.x : 0;
  const fallbackY = typeof element.y === "number" ? element.y : 0;
  const fallbackWidth =
    typeof element.width === "number" ? element.width : 0;
  const fallbackHeight =
    typeof element.height === "number" ? element.height : 0;

  const rawPoints = Array.isArray(element.points)
    ? element.points.filter((point) =>
        point && typeof point.x === "number" && typeof point.y === "number",
      )
    : [];

  if (rawPoints.length >= 2) {
    const xs = rawPoints.map((point) => point.x);
    const ys = rawPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const start = rawPoints[0];
    const end = rawPoints[rawPoints.length - 1];
    return {
      ...element,
      points: rawPoints,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    } as DiagramElement;
  }

  const startX =
    "startX" in element && typeof element.startX === "number"
      ? element.startX
      : fallbackX;
  const startY =
    "startY" in element && typeof element.startY === "number"
      ? element.startY
      : fallbackY;
  const endX =
    "endX" in element && typeof element.endX === "number"
      ? element.endX
      : fallbackX + fallbackWidth;
  const endY =
    "endY" in element && typeof element.endY === "number"
      ? element.endY
      : fallbackY + fallbackHeight;

  return {
    ...element,
    startX,
    startY,
    endX,
    endY,
    x: startX,
    y: startY,
    width: endX - startX,
    height: endY - startY,
  } as DiagramElement;
};

export const normalizeDiagramDocument = (
  document: DiagramDocument,
): DiagramDocument => {
  return {
    ...document,
    elements: document.elements.map((element) => {
      if (!isLineLike(element)) {
        return element;
      }

      return normalizeLinePoints(element);
    }),
  };
};

export const serializeDiagram = (document: DiagramDocument) => {
  return {
    ...document,
    elements: document.elements.map((element) => {
      if (!isLineLike(element)) {
        return element;
      }

      const { x, y, width, height, ...rest } = element;
      return rest;
    }),
  };
};

export const isDiagramDocument = (value: unknown): value is DiagramDocument => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const doc = value as DiagramDocument;
  return (
    typeof doc.id === "string" &&
    typeof doc.name === "string" &&
    typeof doc.createdAt === "string" &&
    typeof doc.updatedAt === "string" &&
    Array.isArray(doc.elements)
  );
};

export const toStoredSummary = (
  document: DiagramDocument,
): StoredDiagramSummary => ({
  id: document.id,
  name: document.name,
  updatedAt: document.updatedAt,
});
