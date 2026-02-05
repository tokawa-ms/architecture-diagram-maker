const HISTORY_LIMIT_STORAGE_KEY = "architecture-diagram:historyLimit";
const DEFAULT_HISTORY_LIMIT = 100;

const clampHistoryLimit = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_HISTORY_LIMIT;
  return Math.min(1000, Math.max(10, Math.floor(value)));
};

const getEnvHistoryLimit = () => {
  if (typeof process === "undefined") return undefined;
  const raw = process.env.NEXT_PUBLIC_HISTORY_LIMIT;
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getDefaultHistoryLimit = () => {
  const envLimit = getEnvHistoryLimit();
  if (typeof envLimit === "number") {
    return clampHistoryLimit(envLimit);
  }
  return DEFAULT_HISTORY_LIMIT;
};

export const getHistoryLimit = () => {
  if (typeof window === "undefined") {
    return getDefaultHistoryLimit();
  }
  const raw = window.localStorage.getItem(HISTORY_LIMIT_STORAGE_KEY);
  if (!raw) return getDefaultHistoryLimit();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return getDefaultHistoryLimit();
  return clampHistoryLimit(parsed);
};

export const setHistoryLimit = (value: number) => {
  if (typeof window === "undefined") return;
  const next = clampHistoryLimit(value);
  window.localStorage.setItem(HISTORY_LIMIT_STORAGE_KEY, String(next));
};

export { HISTORY_LIMIT_STORAGE_KEY };
