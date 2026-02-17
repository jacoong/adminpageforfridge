import { QueryClient, QueryFunction } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "./http";

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

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
  return error instanceof Error ? error.message : "Request failed";
}

type CreateFoodPayload = {
  type: "standard" | "mystery" | "cuisine";
  digitNumber?: number;
  label?: string;
  masterName: string;
  names?: Record<string, string>;
};

type NicknamePatchRow = {
  id: number;
  synonym: string;
  lang_code: string;
};

type IngredientPatchRow = {
  id: number;
  label: string;
  master_name: string;
  names: Record<string, string>;
};

type MigrationNewFoodRow = {
  source_id: number;
  target_digit_number: number;
};

type MigrationNicknameRow = {
  source_id: number;
  ingredient_id: number;
  lang_code?: string;
  synonym?: string;
};

const AUTO_NAME_LANG_CODES = [
  "ko",
  "en",
  "ja",
  "zh",
  "fr",
  "es",
  "it",
  "de",
  "vi",
  "th",
] as const;

function normalizeNamesMap(
  rawNames: Record<string, string> | undefined,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  if (!rawNames) return normalized;

  for (const [key, value] of Object.entries(rawNames)) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      normalized[key] = trimmed;
    }
  }

  return normalized;
}

function buildAutoNamesMap(masterName: string): Record<string, string> {
  return AUTO_NAME_LANG_CODES.reduce<Record<string, string>>((acc, code) => {
    acc[code] = masterName;
    return acc;
  }, {});
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<unknown> {
  const upperMethod = method.toUpperCase();

  try {
    if (upperMethod === "POST" && url === "/api/food") {
      const payload = data as CreateFoodPayload;
      const normalizedMasterName = payload.masterName.trim();
      if (!normalizedMasterName) {
        throw new Error("Master name is required");
      }
      const normalizedNames = normalizeNamesMap(payload.names);

      const endpoint =
        payload.type === "mystery"
          ? "/createMisteryFood"
          : payload.type === "cuisine"
            ? "/createCuisineFood"
            : "/createNewFood";

      const body =
        payload.type === "standard"
          ? [
              {
                digitNumber: Number(payload.digitNumber),
                food: {
                  masterName: normalizedMasterName,
                  label: payload.label,
                  names: normalizedNames,
                },
              },
            ]
          : [
              {
                masterName: normalizedMasterName,
                names: Object.keys(normalizedNames).length > 0
                  ? normalizedNames
                  : buildAutoNamesMap(normalizedMasterName),
              },
            ];

      if (payload.type === "standard") {
        if (!payload.label) {
          throw new Error("Label is required for standard food");
        }
        if (typeof payload.digitNumber !== "number" || Number.isNaN(payload.digitNumber)) {
          throw new Error("Digit range is required for standard food");
        }
        if (Object.keys(normalizedNames).length === 0) {
          throw new Error("Localized names are required for standard food");
        }
      }

      const res = await apiClient.post(endpoint, body);
      return res.data;
    }

    if (upperMethod === "PATCH" && url === "/api/fooditem") {
      const res = await apiClient.patch("/patch/fooditem", [data]);
      return res.data;
    }

    if (upperMethod === "DELETE" && url === "/api/ingredient") {
      const payload = data as { id?: unknown; ids?: unknown } | undefined;
      const ids = Array.isArray(payload?.ids)
        ? payload.ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : (() => {
            const singleId = Number(payload?.id);
            return Number.isInteger(singleId) && singleId > 0 ? [singleId] : [];
          })();

      if (ids.length === 0) {
        throw new Error("At least one ingredient ID is required");
      }

      const body = ids.map((id) => ({ id }));
      const res = await apiClient.delete("/delete/ingredient", {
        data: body,
      });
      return res.data;
    }

    if (upperMethod === "PATCH" && url === "/api/fooditems") {
      const rawRows = Array.isArray(data) ? data : [];
      const rows = rawRows
        .map((row) => row as Partial<IngredientPatchRow>)
        .map((row) => ({
          id: Number(row.id),
          label: String(row.label ?? "").trim(),
          master_name: String(row.master_name ?? "").trim(),
          names:
            row.names && typeof row.names === "object"
              ? Object.fromEntries(
                  Object.entries(row.names).map(([key, value]) => [
                    key,
                    String(value ?? "").trim(),
                  ]),
                )
              : {},
        }))
        .filter(
          (row) =>
            Number.isInteger(row.id) &&
            row.id > 0 &&
            row.label.length > 0 &&
            row.master_name.length > 0 &&
            Object.keys(row.names).length > 0 &&
            Object.values(row.names).every(
              (name) => typeof name === "string" && name.trim().length > 0,
            ),
        );

      if (rows.length === 0) {
        throw new Error("At least one valid ingredient row is required");
      }

      const res = await apiClient.patch("/patch/fooditem", rows);
      return res.data;
    }

    if (upperMethod === "POST" && url === "/api/nickname") {
      const res = await apiClient.post("/addNickname", [data]);
      return res.data;
    }

    if (upperMethod === "DELETE" && url === "/api/nickname") {
      const payload = data as { ids?: unknown } | undefined;
      const ids = Array.isArray(payload?.ids)
        ? payload.ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];

      if (ids.length === 0) {
        throw new Error("At least one nickname ID is required");
      }

      const body = ids.map((id) => ({ id }));
      const res = await apiClient.delete("/delete/nickName", { data: body });
      return res.data;
    }

    if (upperMethod === "PATCH" && url === "/api/nickname") {
      const rawRows = Array.isArray(data) ? data : [];
      const rows = rawRows
        .map((row) => row as Partial<NicknamePatchRow>)
        .map((row) => ({
          id: Number(row.id),
          synonym: String(row.synonym ?? "").trim(),
          lang_code: String(row.lang_code ?? "").trim(),
        }))
        .filter((row) => Number.isInteger(row.id) && row.id > 0 && row.synonym.length > 0 && row.lang_code.length > 0);

      if (rows.length === 0) {
        throw new Error("At least one valid nickname row is required");
      }

      const res = await apiClient.patch("/patch/nickName", rows);
      return res.data;
    }

    if (upperMethod === "POST" && url === "/api/migration/newfood") {
      const rawRows = Array.isArray(data) ? data : [data];
      const rows = rawRows
        .map((row) => row as Partial<MigrationNewFoodRow>)
        .map((row) => ({
          source_id: Number(row.source_id),
          target_digit_number: Number(row.target_digit_number),
        }))
        .filter(
          (row) =>
            Number.isInteger(row.source_id) &&
            row.source_id > 0 &&
            Number.isInteger(row.target_digit_number) &&
            row.target_digit_number > 0,
        );

      if (rows.length === 0) {
        throw new Error("At least one valid migration row is required");
      }

      const res = await apiClient.post("/migrationNewFood", rows);
      return res.data;
    }

    if (upperMethod === "POST" && url === "/api/migration") {
      const rawRows = Array.isArray(data) ? data : [data];
      const rows = rawRows
        .map((row) => row as Partial<MigrationNicknameRow>)
        .map((row) => ({
          source_id: Number(row.source_id),
          ingredient_id: Number(row.ingredient_id),
          lang_code: String(row.lang_code ?? "ko").trim(),
          synonym: row.synonym ? String(row.synonym).trim() : undefined,
        }))
        .filter(
          (row) =>
            Number.isInteger(row.source_id) &&
            row.source_id > 0 &&
            Number.isInteger(row.ingredient_id) &&
            row.ingredient_id > 0 &&
            row.lang_code.length > 0,
        );

      if (rows.length === 0) {
        throw new Error("At least one valid migration row is required");
      }

      const res = await apiClient.post("/migrationIngredientToNickname", rows);
      return res.data;
    }

    throw new Error(`Unsupported API route: ${upperMethod} ${url}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>({
  on401: unauthorizedBehavior,
}: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> =>
  async ({ queryKey }) => {
    const [route, value] = queryKey as [string, unknown];

    try {
      if (route === "/api/search") {
        const res = await apiClient.get("/search", {
          params: { q: String(value ?? "") },
        });
        return unwrapData<T>(res.data);
      }

      if (route === "/api/range") {
        const res = await apiClient.get("/getxdigititems", {
          params: { digitNumber: Number(value) },
        });
        return unwrapData<T>(res.data);
      }

      if (route === "/api/ingredients") {
        const rawIds = Array.isArray(value) ? value : [];
        const ids = rawIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0);

        if (ids.length === 0) {
          return [] as T;
        }

        const res = await apiClient.post("/ingredients", ids);
        return unwrapData<T>(res.data);
      }

      if (route === "/api/nicknames/by-ingredient") {
        const ingredientId = Number(value);
        if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
          return [] as T;
        }

        const res = await apiClient.get("/get/nickName", {
          params: { ingredient_id: ingredientId },
        });
        return unwrapData<T>(res.data);
      }

      if (route === "/api/nicknames/by-id") {
        const nicknameId = Number(value);
        if (!Number.isInteger(nicknameId) || nicknameId <= 0) {
          return [] as T;
        }

        const res = await apiClient.get("/get/nickName/byId", {
          params: { id: nicknameId },
        });
        let payload: unknown = res.data;
        if (payload && typeof payload === "object" && "data" in payload) {
          payload = (payload as { data: unknown }).data;
        }
        if (Array.isArray(payload)) return payload as T;
        if (payload && typeof payload === "object") return [payload] as T;
        return [] as T;
      }

      if (route === "/api/nicknames/search") {
        const nickname = String(value ?? "").trim();
        if (!nickname) {
          return [] as T;
        }

        const res = await apiClient.get("/get/nickName/search", {
          params: { nickname },
        });
        return unwrapData<T>(res.data);
      }

      throw new Error(`Unsupported query route: ${route}`);
    } catch (error) {
      if (unauthorizedBehavior === "returnNull" && axios.isAxiosError(error) && error.response?.status === 401) {
        return null as T;
      }
      throw new Error(getErrorMessage(error));
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
