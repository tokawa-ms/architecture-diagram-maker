import type { DiagramDocument, StoredDiagramSummary } from "./types";

const STORAGE_INDEX_KEY = "architecture-diagram:index";
const STORAGE_PREFIX = "architecture-diagram:doc:";

export const toStorageKey = (id: string) => `${STORAGE_PREFIX}${id}`;

const readIndex = (): StoredDiagramSummary[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as StoredDiagramSummary[];
  } catch (error) {
    console.error("Failed to parse storage index", error);
    return [];
  }
};

const writeIndex = (items: StoredDiagramSummary[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(items));
};

export const listStoredDiagrams = (): StoredDiagramSummary[] => {
  return readIndex().sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

export const saveDiagram = (document: DiagramDocument) => {
  if (typeof window === "undefined") {
    return;
  }
  console.log("Persisting diagram", document.id);
  const key = toStorageKey(document.id);
  window.localStorage.setItem(key, JSON.stringify(serializeDiagram(document)));
  const summary: StoredDiagramSummary = {
    id: document.id,
    name: document.name,
    updatedAt: document.updatedAt,
  };
  const index = readIndex();
  const existingIndex = index.filter((item) => item.id !== document.id);
  writeIndex([summary, ...existingIndex]);
};

const normalizeDiagramDocument = (document: DiagramDocument): DiagramDocument => {
  return {
    ...document,
    elements: document.elements.map((element) => {
      if (element.type !== "arrow" && element.type !== "line") {
        return element;
      }

      const fallbackX = typeof element.x === "number" ? element.x : 0;
      const fallbackY = typeof element.y === "number" ? element.y : 0;
      const fallbackWidth = typeof element.width === "number" ? element.width : 0;
      const fallbackHeight = typeof element.height === "number" ? element.height : 0;

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
      };
    }),
  };
};

const serializeDiagram = (document: DiagramDocument) => {
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

export const loadDiagram = (id: string): DiagramDocument | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(toStorageKey(id));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!isDiagramDocument(parsed)) {
      return null;
    }
    return normalizeDiagramDocument(parsed);
  } catch (error) {
    console.error("Failed to parse diagram", error);
    return null;
  }
};

export const deleteDiagram = (id: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(toStorageKey(id));
  writeIndex(readIndex().filter((item) => item.id !== id));
};

export const exportDiagramJson = (document: DiagramDocument) =>
  JSON.stringify(serializeDiagram(document), null, 2);

export const importDiagramJson = (value: string): DiagramDocument | null => {
  try {
    const parsed = JSON.parse(value);
    if (!isDiagramDocument(parsed)) {
      return null;
    }
    return normalizeDiagramDocument(parsed);
  } catch (error) {
    console.error("Failed to import diagram JSON", error);
    return null;
  }
};

const isDiagramDocument = (value: unknown): value is DiagramDocument => {
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
