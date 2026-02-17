import axios from "axios";
import { getApiBaseUrl } from "./api-config";
import { getStoredApiKey } from "./auth-storage";

const POST_LOGIN_BASE_URL = (
  import.meta.env.VITE_API_AFTER_LOGIN_BASE_URL ||
  "https://w4bwrqmrv6.execute-api.ap-northeast-2.amazonaws.com/stageAitracker"
)
  .trim()
  .replace(/\/$/, "");

export const apiClient = axios.create({
  // Explicit CORS-related behavior for browser requests.
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
  timeout: 20000,
});

export function setApiKeyHeader(apiKey: string): void {
  const normalizedKey = apiKey.trim();
  const commonHeaders = apiClient.defaults.headers.common as Record<string, string>;
  if (normalizedKey) {
    commonHeaders["x-api-key"] = normalizedKey;
  } else {
    delete commonHeaders["x-api-key"];
  }
}

apiClient.interceptors.request.use((config) => {
  const isLoginRequest = String(config.url || "").replace(/\/+$/, "") === "/admin";
  const loginBaseUrl = getApiBaseUrl();
  const baseUrl = isLoginRequest ? loginBaseUrl : POST_LOGIN_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      isLoginRequest
        ? "Login API base URL is not configured"
        : "Post-login API base URL is not configured",
    );
  }

  const apiKey = getStoredApiKey();
  const headers = config.headers;

  if (headers && typeof (headers as { set?: unknown }).set === "function") {
    if (!isLoginRequest && apiKey) {
      (headers as { set: (name: string, value: string) => void }).set("x-api-key", apiKey);
    } else if (typeof (headers as { delete?: unknown }).delete === "function") {
      (headers as { delete: (name: string) => void }).delete("x-api-key");
    }
  } else {
    const nextHeaders = (headers || {}) as Record<string, string>;
    if (!isLoginRequest && apiKey) {
      nextHeaders["x-api-key"] = apiKey;
    } else {
      delete nextHeaders["x-api-key"];
    }
    config.headers = nextHeaders;
  }

  config.baseURL = baseUrl;
  config.withCredentials = false;
  return config;
});
