import { apiClient } from "./http";

export type IngredientCategory = {
  label: string;
  startId: number;
  endId: number;
  examples?: string;
};

type RawIngredientCategory = {
  label?: unknown;
  start_id?: unknown;
  startId?: unknown;
  target_digit_number?: unknown;
  digitNumber?: unknown;
  end_id?: unknown;
  endId?: unknown;
  examples?: unknown;
  example?: unknown;
};

export const FALLBACK_INGREDIENT_CATEGORIES: IngredientCategory[] = [
  { label: "vegetable", startId: 1000, endId: 1499, examples: "양파, 감자, 시금치" },
  { label: "fruit", startId: 1500, endId: 1999, examples: "사과, 바나나, 망고" },
  { label: "meat", startId: 2000, endId: 2299, examples: "소고기, 돼지고기, 양고기" },
  { label: "poultry", startId: 2300, endId: 2499, examples: "닭고기, 오리고기, 칠면조" },
  { label: "seafood", startId: 2500, endId: 2999, examples: "고등어, 연어, 새우" },
  { label: "egg", startId: 3000, endId: 3099, examples: "계란, 메추리알, 오리알" },
  { label: "dairy", startId: 3100, endId: 3199, examples: "우유, 버터, 크림" },
  { label: "yogurt", startId: 3200, endId: 3299, examples: "플레인 요거트, 그릭 요거트" },
  { label: "cheese", startId: 3300, endId: 3499, examples: "체다, 모차렐라, 고르곤졸라" },
  { label: "rice", startId: 3500, endId: 3699, examples: "백미, 현미, 흑미" },
  { label: "grain", startId: 3700, endId: 3899, examples: "보리, 귀리, 퀴노아" },
  { label: "legume", startId: 3900, endId: 4099, examples: "병아리콩, 강낭콩, 완두콩" },
  { label: "nut", startId: 4100, endId: 4299, examples: "아몬드, 호두, 땅콩" },
  { label: "noodle", startId: 4300, endId: 4599, examples: "스파게티, 우동, 당면" },
  { label: "bread", startId: 4600, endId: 4899, examples: "식빵, 베이글, 또띠아" },
  { label: "spice", startId: 4900, endId: 5499, examples: "소금, 후추, 고춧가루, 허브" },
  { label: "oil", startId: 5500, endId: 5899, examples: "올리브유, 참기름, 카놀라유" },
  { label: "sauce", startId: 5900, endId: 6399, examples: "간장, 케첩, 마요네즈, 굴소스" },
  { label: "processed_meal", startId: 6400, endId: 6699, examples: "베이컨, 살라미, 소시지" },
  { label: "fermented_product", startId: 6700, endId: 7499, examples: "김치류, 젓갈류, 된장" },
  { label: "snack", startId: 7500, endId: 7999, examples: "감자칩, 육포, 김부각" },
  { label: "other", startId: 8000, endId: 8999, examples: "기타 분류되지 않은 식재료" },
  { label: "mystery", startId: 9000, endId: 9999, examples: "미스터리 식재료" },
  { label: "cuisine", startId: 10000, endId: 10999, examples: "요리" },
];

const FALLBACK_CATEGORY_MAP = new Map(
  FALLBACK_INGREDIENT_CATEGORIES.map((category) => [category.label, category]),
);

export const INGREDIENT_CATEGORIES_QUERY_KEY = ["/api/ingredient-categories"] as const;

export function normalizeCategoryLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  return normalized === "mistery" ? "mystery" : normalized;
}

function getNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseIngredientCategory(raw: RawIngredientCategory): IngredientCategory | null {
  const label = normalizeCategoryLabel(String(raw.label ?? ""));
  if (!label) return null;

  const fallback = FALLBACK_CATEGORY_MAP.get(label);
  const startId = getNumber(raw.start_id ?? raw.startId ?? raw.target_digit_number ?? raw.digitNumber)
    ?? fallback?.startId
    ?? null;

  if (!startId) return null;

  const endId = getNumber(raw.end_id ?? raw.endId) ?? fallback?.endId ?? startId;
  const examplesSource = raw.examples ?? raw.example ?? fallback?.examples;
  const examples = typeof examplesSource === "string" ? examplesSource.trim() : undefined;

  return {
    label,
    startId,
    endId,
    examples: examples || undefined,
  };
}

export function normalizeIngredientCategories(payload: unknown): IngredientCategory[] {
  const rawList = (() => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && "data" in payload) {
      const data = (payload as { data?: unknown }).data;
      return Array.isArray(data) ? data : [];
    }
    return [];
  })();

  const parsed = rawList
    .map((item) => (item && typeof item === "object" ? parseIngredientCategory(item as RawIngredientCategory) : null))
    .filter((item): item is IngredientCategory => item !== null);

  if (parsed.length === 0) {
    return [...FALLBACK_INGREDIENT_CATEGORIES];
  }

  const parsedMap = new Map(parsed.map((category) => [category.label, category]));
  const merged = FALLBACK_INGREDIENT_CATEGORIES
    .map((fallback) => parsedMap.get(fallback.label) ?? fallback);

  for (const category of parsed) {
    if (!FALLBACK_CATEGORY_MAP.has(category.label)) {
      merged.push(category);
    }
  }

  return merged;
}

export async function fetchIngredientCategories(): Promise<IngredientCategory[]> {
  try {
    const res = await apiClient.get("/ingredientCategories");
    return normalizeIngredientCategories(res.data);
  } catch {
    return [...FALLBACK_INGREDIENT_CATEGORIES];
  }
}

export function formatCategoryRange(category: IngredientCategory): string {
  return `${category.startId}~${category.endId}`;
}

export function formatCategoryOptionLabel(category: IngredientCategory): string {
  return `${category.label} (${formatCategoryRange(category)})`;
}

export function findIngredientCategory(
  categories: IngredientCategory[],
  label: string,
): IngredientCategory | undefined {
  const normalizedLabel = normalizeCategoryLabel(label);
  return categories.find((category) => category.label === normalizedLabel);
}
