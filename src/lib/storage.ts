import type {
  DiagramDocument,
  DiagramHistoryEntrySummary,
  StoredDiagramSummary,
} from "./types";
import {
  isDiagramDocument,
  normalizeDiagramDocument,
  serializeDiagram,
  toStoredSummary,
} from "./diagram-serialization";

const STORAGE_INDEX_KEY = "architecture-diagram:index";
const STORAGE_PREFIX = "architecture-diagram:doc:";
const STORAGE_DRAFT_KEY = "architecture-diagram:draft";
const HISTORY_INDEX_KEY = "architecture-diagram:history:index";
const HISTORY_ENTRY_PREFIX = "architecture-diagram:history:entry:";

/**
 * Build a user-scoped storage key prefix.
 * When MSAL is active the email is used to namespace all localStorage keys
 * so that different users on the same browser never see each other's data.
 */
const userPrefix = (): string => {
  if (currentUserEmail) {
    return `[${currentUserEmail}]`;
  }
  return "";
};

const storageIndexKey = () => `${userPrefix()}${STORAGE_INDEX_KEY}`;
const storageDocKey = (id: string) => `${userPrefix()}${STORAGE_PREFIX}${id}`;
const storageDraftKey = () => `${userPrefix()}${STORAGE_DRAFT_KEY}`;
const historyIndexKey = () => `${userPrefix()}${HISTORY_INDEX_KEY}`;
const historyEntryKey = (id: string) => `${userPrefix()}${HISTORY_ENTRY_PREFIX}${id}`;

export const toStorageKey = (id: string) => storageDocKey(id);

/** Name of the cookie set by SimpleAuth login containing the virtual email. */
const SIMPLE_AUTH_EMAIL_COOKIE = "simple_auth_email";
/** Fixed virtual email for completely unauthenticated users. */
const ANONYMOUS_VIRTUAL_EMAIL = "anonymous@anonymous.local";

/**
 * Read a cookie value by name from `document.cookie`.
 * Returns null if not found or running server-side.
 */
const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Whether the current user is logged in via SimpleAuth.
 * Checks for the presence of the `simple_auth_email` cookie.
 */
export const isSimpleAuthLoggedIn = (): boolean => {
  return readCookie(SIMPLE_AUTH_EMAIL_COOKIE) !== null;
};

/**
 * Resolve the virtual user email for client-side use.
 *
 * Priority:

 *  1. Explicit MSAL email (passed as argument)
 *  2. `simple_auth_email` cookie (set by SimpleAuth login)
 *  3. `anonymous@anonymous.local` fallback
 *
 * Uses RFC 2606 reserved domains (.local) for non-MSAL cases so
 * virtual emails can never collide with real Entra ID addresses.
 */
export const resolveVirtualEmail = (msalEmail: string | null): string => {
  if (msalEmail) return msalEmail;
  const cookieEmail = readCookie(SIMPLE_AUTH_EMAIL_COOKIE);
  if (cookieEmail) return cookieEmail;
  return ANONYMOUS_VIRTUAL_EMAIL;
};

/**
 * Module-level holder for the current user's email (real or virtual).
 * Set by the client on page load so that localStorage keys are scoped.
 */
let currentUserEmail: string | null = null;

/**
 * Module-level holder for the current MSAL ID token.
 * Used to authenticate API requests via the Authorization header.
 */
let currentMsalIdToken: string | null = null;

export const setCurrentUserEmail = (email: string | null) => {
  currentUserEmail = email;
};

export const setCurrentMsalIdToken = (token: string | null) => {
  currentMsalIdToken = token;
};

export const getCurrentUserEmail = () => currentUserEmail;

const readIndex = (): StoredDiagramSummary[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(storageIndexKey());
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
  window.localStorage.setItem(storageIndexKey(), JSON.stringify(items));
};

const readHistoryIndex = (): DiagramHistoryEntrySummary[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(historyIndexKey());
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as DiagramHistoryEntrySummary[];
  } catch (error) {
    console.error("Failed to parse history index", error);
    return [];
  }
};

const writeHistoryIndex = (items: DiagramHistoryEntrySummary[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(historyIndexKey(), JSON.stringify(items));
};

const listStoredDiagramsLocal = (): StoredDiagramSummary[] => {
  return readIndex().sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

export const listHistoryEntries = (): DiagramHistoryEntrySummary[] => {
  return readHistoryIndex().sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
};

export const loadHistoryEntry = (id: string): DiagramDocument | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(historyEntryKey(id));
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
    console.error("Failed to parse history entry", error);
    return null;
  }
};

export const appendHistoryEntry = (document: DiagramDocument, limit: number) => {
  if (typeof window === "undefined") {
    return;
  }
  const index = readHistoryIndex();
  const latest = index[0];
  if (
    latest &&
    latest.diagramId === document.id &&
    latest.savedAt === document.updatedAt
  ) {
    return;
  }

  const entryId = `history-${document.id}-${Date.now()}`;
  const summary: DiagramHistoryEntrySummary = {
    id: entryId,
    diagramId: document.id,
    name: document.name,
    savedAt: document.updatedAt,
    elementCount: document.elements.length,
  };
  try {
    window.localStorage.setItem(
      historyEntryKey(entryId),
      JSON.stringify(serializeDiagram(document)),
    );
  } catch (error) {
    console.error("Failed to persist history entry", error);
    return;
  }

  const nextIndex = [summary, ...index];
  const trimmed = nextIndex.slice(0, Math.max(1, limit));
  const removed = nextIndex.slice(trimmed.length);
  writeHistoryIndex(trimmed);
  for (const removedEntry of removed) {
    window.localStorage.removeItem(historyEntryKey(removedEntry.id));
  }
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
    const headers = new Headers(init?.headers);
    if (currentMsalIdToken) {
      headers.set("Authorization", `Bearer ${currentMsalIdToken}`);
    }
    const response = await fetch(input, { ...init, headers });
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
  const raw = window.localStorage.getItem(storageDraftKey());
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
      storageDraftKey(),
      JSON.stringify(serializeDiagram(document)),
    );
  } catch (error) {
    console.error("Failed to persist draft diagram", error);
  }
};
