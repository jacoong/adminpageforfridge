const AUTH_STORAGE_KEY = "master_food_admin_authenticated";
const API_KEY_STORAGE_KEY = "master_food_admin_api_key";
const AUTH_EXPIRES_AT_KEY = "master_food_admin_auth_expires_at";
const AUTH_TTL_MS = 3 * 60 * 60 * 1000;

function parseExpiresAt(raw: string | null): number {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function isExpired(expiresAt: number): boolean {
  return expiresAt <= Date.now();
}

export function getStoredApiKey(): string {
  try {
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const expiresAt = parseExpiresAt(localStorage.getItem(AUTH_EXPIRES_AT_KEY));
    if (!isAuthenticated || isExpired(expiresAt)) {
      clearStoredAuthSession();
      return "";
    }
    return (localStorage.getItem(API_KEY_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function isStoredAuthenticated(): boolean {
  try {
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const apiKey = (localStorage.getItem(API_KEY_STORAGE_KEY) || "").trim();
    const expiresAt = parseExpiresAt(localStorage.getItem(AUTH_EXPIRES_AT_KEY));

    if (!isAuthenticated || !apiKey || isExpired(expiresAt)) {
      clearStoredAuthSession();
      return false;
    }

    return true;
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
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + AUTH_TTL_MS));
  } catch {}
}

export function clearStoredAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  } catch {}
}

function clearExpiredStoredAuthSession(): void {
  try {
    const expiresAt = parseExpiresAt(localStorage.getItem(AUTH_EXPIRES_AT_KEY));
    if (expiresAt > 0 && isExpired(expiresAt)) {
      clearStoredAuthSession();
    }
  } catch {}
}

clearExpiredStoredAuthSession();
