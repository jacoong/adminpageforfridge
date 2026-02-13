import { create } from "zustand";

interface ApiConfigStore {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
}

export const STORAGE_KEY = "master_food_admin_api_url";
export const DEV_PROXY_BASE_URL = "/api-proxy";
const USE_LOCAL_PROXY = import.meta.env.VITE_API_USE_PROXY === "true";

export const normalizeBaseUrl = (url: string): string =>
  url.trim().replace(/\/$/, "");

export const DEFAULT_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || "",
);

const getStoredUrl = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || "";
    const normalized = normalizeBaseUrl(saved);
    // Ignore legacy proxy value saved from older versions.
    if (normalized === DEV_PROXY_BASE_URL) {
      localStorage.removeItem(STORAGE_KEY);
      return "";
    }
    return normalized;
  } catch {
    return "";
  }
};

export const getApiBaseUrl = (): string => {
  if (USE_LOCAL_PROXY) {
    return DEV_PROXY_BASE_URL;
  }

  if (DEFAULT_BASE_URL) return DEFAULT_BASE_URL;
  const stored = getStoredUrl();
  if (stored) return stored;
  return "";
};

export const useApiConfig = create<ApiConfigStore>((set) => ({
  baseUrl: getApiBaseUrl(),
  setBaseUrl: (url: string) => {
    if (USE_LOCAL_PROXY) {
      set({ baseUrl: DEV_PROXY_BASE_URL });
      return;
    }

    const normalized = normalizeBaseUrl(url);
    try {
      if (normalized) {
        localStorage.setItem(STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    set({ baseUrl: normalized || DEFAULT_BASE_URL });
  },
}));
