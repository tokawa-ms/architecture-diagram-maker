const HISTORY_LIMIT_STORAGE_KEY = "architecture-diagram:historyLimit";
const EXPORT_SCALE_STORAGE_KEY = "architecture-diagram:exportScale";
const DEFAULT_HISTORY_LIMIT = 100;
const DEFAULT_EXPORT_SCALE = 4;

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

const clampExportScale = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_EXPORT_SCALE;
  return Math.min(8, Math.max(1, Math.round(value)));
};

const getEnvExportScale = () => {
  if (typeof process === "undefined") return undefined;
  const raw = process.env.NEXT_PUBLIC_EXPORT_SCALE;
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

export const getDefaultExportScale = () => {
  const envScale = getEnvExportScale();
  if (typeof envScale === "number") {
    return clampExportScale(envScale);
  }
  return DEFAULT_EXPORT_SCALE;
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

export const getExportScale = () => {
  if (typeof window === "undefined") {
    return getDefaultExportScale();
  }
  const raw = window.localStorage.getItem(EXPORT_SCALE_STORAGE_KEY);
  if (!raw) return getDefaultExportScale();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return getDefaultExportScale();
  return clampExportScale(parsed);
};

export const setHistoryLimit = (value: number) => {
  if (typeof window === "undefined") return;
  const next = clampHistoryLimit(value);
  window.localStorage.setItem(HISTORY_LIMIT_STORAGE_KEY, String(next));
};

export const setExportScale = (value: number) => {
  if (typeof window === "undefined") return;
  const next = clampExportScale(value);
  window.localStorage.setItem(EXPORT_SCALE_STORAGE_KEY, String(next));
};

export { EXPORT_SCALE_STORAGE_KEY, HISTORY_LIMIT_STORAGE_KEY };
