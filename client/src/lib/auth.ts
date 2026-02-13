import axios from "axios";
import { apiClient } from "./http";

const AUTH_STORAGE_KEY = "master_food_admin_authenticated";

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
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

export async function login(username: string, password: string): Promise<void> {
  try {
    await apiClient.post("/admin", { username, password });
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
