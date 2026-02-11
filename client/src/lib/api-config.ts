import { create } from "zustand";

interface ApiConfigStore {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  syncToServer: () => Promise<void>;
}

const STORAGE_KEY = "master_food_admin_api_url";

const getStoredUrl = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

export const useApiConfig = create<ApiConfigStore>((set, get) => ({
  baseUrl: getStoredUrl(),
  setBaseUrl: (url: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {}
    set({ baseUrl: url });
    fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl: url }),
    }).catch(() => {});
  },
  syncToServer: async () => {
    const { baseUrl } = get();
    if (baseUrl) {
      try {
        await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl }),
        });
      } catch {}
    }
  },
}));
