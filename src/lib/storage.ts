import type { DiagramDocument, StoredDiagramSummary } from "./types";
import {
  isDiagramDocument,
  normalizeDiagramDocument,
  serializeDiagram,
  toStoredSummary,
} from "./diagram-serialization";

const STORAGE_INDEX_KEY = "architecture-diagram:index";
const STORAGE_PREFIX = "architecture-diagram:doc:";
const STORAGE_DRAFT_KEY = "architecture-diagram:draft";

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

const listStoredDiagramsLocal = (): StoredDiagramSummary[] => {
  return readIndex().sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

const saveDiagramLocal = (document: DiagramDocument) => {
  if (typeof window === "undefined") {
    return;
  }
  console.log("Persisting diagram", document.id);
  const key = toStorageKey(document.id);
  window.localStorage.setItem(key, JSON.stringify(serializeDiagram(document)));
  const summary: StoredDiagramSummary = toStoredSummary(document);
  const index = readIndex();
  const existingIndex = index.filter((item) => item.id !== document.id);
  writeIndex([summary, ...existingIndex]);
};

const loadDiagramLocal = (id: string): DiagramDocument | null => {
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

const deleteDiagramLocal = (id: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(toStorageKey(id));
  writeIndex(readIndex().filter((item) => item.id !== id));
};

const fetchApi = async <T>(input: RequestInfo, init?: RequestInit) => {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn("Failed to reach diagram API", error);
    return null;
  }
};

export const listStoredDiagrams = async (): Promise<StoredDiagramSummary[]> => {
  if (typeof window === "undefined") {
    return [];
  }
  const response = await fetchApi<{ items?: StoredDiagramSummary[] }>(
    "/api/diagrams",
  );
  if (response?.items && Array.isArray(response.items)) {
    return response.items.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
  return listStoredDiagramsLocal();
};

export const saveDiagram = async (document: DiagramDocument) => {
  if (typeof window === "undefined") {
    return;
  }
  const payload = serializeDiagram(document);
  const response = await fetchApi<{ ok?: boolean }>("/api/diagrams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document: payload }),
  });
  if (response?.ok) {
    return;
  }
  saveDiagramLocal(document);
};

export const loadDiagram = async (id: string): Promise<DiagramDocument | null> => {
  if (typeof window === "undefined") {
    return null;
  }
  const response = await fetchApi<{ document?: DiagramDocument }>(
    `/api/diagrams?id=${encodeURIComponent(id)}`,
  );
  if (response?.document && isDiagramDocument(response.document)) {
    return normalizeDiagramDocument(response.document);
  }
  return loadDiagramLocal(id);
};

export const deleteDiagram = async (id: string) => {
  if (typeof window === "undefined") {
    return;
  }
  const response = await fetchApi<{ ok?: boolean }>(
    `/api/diagrams?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (response?.ok) {
    return;
  }
  deleteDiagramLocal(id);
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

export const loadDraftDiagram = (): DiagramDocument | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_DRAFT_KEY);
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
    console.error("Failed to parse draft diagram", error);
    return null;
  }
};

export const saveDraftDiagram = (document: DiagramDocument) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_DRAFT_KEY,
      JSON.stringify(serializeDiagram(document)),
    );
  } catch (error) {
    console.error("Failed to persist draft diagram", error);
  }
};
