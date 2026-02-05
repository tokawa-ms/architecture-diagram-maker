import type { DiagramDocument, DiagramElement, StoredDiagramSummary } from "./types";

export const normalizeDiagramDocument = (
  document: DiagramDocument,
): DiagramDocument => {
  return {
    ...document,
    elements: document.elements.map((element) => {
      if (element.type !== "arrow" && element.type !== "line") {
        return element;
      }

      const fallbackX = typeof element.x === "number" ? element.x : 0;
      const fallbackY = typeof element.y === "number" ? element.y : 0;
      const fallbackWidth =
        typeof element.width === "number" ? element.width : 0;
      const fallbackHeight =
        typeof element.height === "number" ? element.height : 0;

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
    }),
  };
};

export const serializeDiagram = (document: DiagramDocument) => {
  return {
    ...document,
    elements: document.elements.map((element) => {
      if (element.type !== "arrow" && element.type !== "line") {
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
