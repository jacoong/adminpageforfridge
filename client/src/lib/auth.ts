import axios from "axios";
import { apiClient, setApiKeyHeader } from "./http";
import {
  clearStoredAuthSession,
  getStoredApiKey,
  isStoredAuthenticated,
  persistAuthSession,
} from "./auth-storage";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (typeof data === "string") return status ? `${status}: ${data}` : data;
    if (data && typeof data === "object") {
      const message =
        ("error" in data && data.error) ||
        ("message" in data && data.message) ||
        ("detail" in data && data.detail);
      if (message) {
        const msg = String(message);
        return status ? `${status}: ${msg}` : msg;
      }
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Login failed";
}

export function isAuthenticated(): boolean {
  const authenticated = isStoredAuthenticated();
  if (authenticated) {
    setApiKeyHeader(getStoredApiKey());
  } else {
    setApiKeyHeader("");
  }
  return authenticated;
}

export function logout(): void {
  clearStoredAuthSession();
  setApiKeyHeader("");
}

export async function login(username: string, password: string): Promise<void> {
  try {
    const response = await apiClient.post<{ api_key?: string }>("/admin", {
      username,
      password,
    });
    const apiKey = String(response.data?.api_key || "").trim();
    if (!apiKey) {
      throw new Error("Login response is missing api_key");
    }
    persistAuthSession(apiKey);
    setApiKeyHeader(apiKey);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
