const AUTH_STORAGE_KEY = "master_food_admin_authenticated";
const API_KEY_STORAGE_KEY = "master_food_admin_api_key";

export function getStoredApiKey(): string {
  try {
    return (localStorage.getItem(API_KEY_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function isStoredAuthenticated(): boolean {
  try {
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    return isAuthenticated && getStoredApiKey().length > 0;
  } catch {
    return false;
  }
}

export function persistAuthSession(nextApiKey: string): void {
  const normalizedKey = nextApiKey.trim();
  if (!normalizedKey) {
    clearStoredAuthSession();
    return;
  }

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    localStorage.setItem(API_KEY_STORAGE_KEY, normalizedKey);
  } catch {}
}

export function clearStoredAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {}
}
