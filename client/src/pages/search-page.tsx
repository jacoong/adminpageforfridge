import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Edit3, Trash2, Loader2, ListFilter, Hash, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EditFoodDialog } from "@/components/edit-food-dialog";
import type { FoodItem } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RANGES = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000] as const;
const NICKNAME_LANGS = ["ko", "en", "ja", "zh", "fr", "es", "it", "de", "vi", "th"] as const;
const SEARCH_STATE_STORAGE_KEY = "search_page_state_v1";

type SearchTarget = "ingredient" | "nickname";
type IngredientSearchMode = "keyword" | "range" | "ids";
type SearchRequest =
  | { target: "ingredient"; route: "/api/search"; value: string }
  | { target: "ingredient"; route: "/api/range"; value: number }
  | { target: "ingredient"; route: "/api/ingredients"; value: number[] }
  | { target: "nickname"; route: "/api/nicknames/by-ingredient"; value: number }
  | { target: "nickname"; route: "/api/nicknames/by-id"; value: number }
  | { target: "nickname"; route: "/api/nicknames/search"; value: string };

type NicknameItem = {
  id?: number;
  ingredient_id?: number;
  lang_code?: string;
  synonym?: string;
  created_at?: string;
};

type NicknameSearchGroup = {
  ingredient_id?: number;
  count?: number;
  data?: NicknameItem[];
};

type SearchResultItem = FoodItem | NicknameItem | NicknameSearchGroup;

type SearchPageStateSnapshot = {
  target: SearchTarget;
  ingredientMode: IngredientSearchMode;
  keywordInput: string;
  selectedRange: number;
  idsInput: string;
  nicknameIngredientId: string;
  nicknameIdInput: string;
  nicknameKeywordInput: string;
  searchRequest: SearchRequest | null;
};

const DEFAULT_SEARCH_STATE: SearchPageStateSnapshot = {
  target: "ingredient",
  ingredientMode: "keyword",
  keywordInput: "",
  selectedRange: 1000,
  idsInput: "",
  nicknameIngredientId: "",
  nicknameIdInput: "",
  nicknameKeywordInput: "",
  searchRequest: null,
};

function parseIdList(input: string): number[] {
  const unique = new Set<number>();

  input
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .forEach((part) => {
      const id = Number(part);
      if (Number.isInteger(id) && id > 0) unique.add(id);
    });

  return Array.from(unique);
}

function sanitizeIdsInput(input: string): string {
  return input.replace(/[^\d,\s]/g, "");
}

function sanitizeDigitInput(input: string): string {
  return input.replace(/[^\d]/g, "");
}

function isNicknameItem(value: unknown): value is NicknameItem {
  if (!value || typeof value !== "object") return false;
  return "synonym" in value || "lang_code" in value || "ingredient_id" in value;
}

function isNicknameSearchGroup(value: unknown): value is NicknameSearchGroup {
  if (!value || typeof value !== "object") return false;
  return "ingredient_id" in value && "data" in value && Array.isArray((value as { data?: unknown }).data);
}

function normalizeNicknameSearchGroups(rows: SearchResultItem[]): NicknameSearchGroup[] {
  const groupedRows = rows.filter(isNicknameSearchGroup).map((group) => {
    const data = Array.isArray(group.data) ? group.data.filter(isNicknameItem) : [];
    const ingredientId = Number(group.ingredient_id);
    return {
      ingredient_id: Number.isInteger(ingredientId) && ingredientId > 0 ? ingredientId : undefined,
      count: typeof group.count === "number" ? group.count : data.length,
      data,
    };
  });

  if (groupedRows.length > 0) return groupedRows;

  const fallbackGroups = new Map<number, NicknameItem[]>();
  rows.filter(isNicknameItem).forEach((item) => {
    const ingredientId = Number(item.ingredient_id);
    if (!Number.isInteger(ingredientId) || ingredientId <= 0) return;
    const existing = fallbackGroups.get(ingredientId) ?? [];
    existing.push(item);
    fallbackGroups.set(ingredientId, existing);
  });

  return Array.from(fallbackGroups.entries()).map(([ingredient_id, data]) => ({
    ingredient_id,
    count: data.length,
    data,
  }));
}

function normalizeSearchRequest(raw: unknown): SearchRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { target?: unknown; route?: unknown; value?: unknown };
  if (candidate.target === "ingredient" && candidate.route === "/api/search" && typeof candidate.value === "string") {
    return { target: "ingredient", route: "/api/search", value: candidate.value };
  }
  if (candidate.target === "ingredient" && candidate.route === "/api/range" && typeof candidate.value === "number") {
    return { target: "ingredient", route: "/api/range", value: candidate.value };
  }
  if (
    candidate.target === "ingredient" &&
    candidate.route === "/api/ingredients" &&
    Array.isArray(candidate.value)
  ) {
    const ids = candidate.value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    return { target: "ingredient", route: "/api/ingredients", value: ids };
  }
  if (
    candidate.target === "nickname" &&
    candidate.route === "/api/nicknames/by-ingredient" &&
    typeof candidate.value === "number"
  ) {
    return { target: "nickname", route: "/api/nicknames/by-ingredient", value: candidate.value };
  }
  if (
    candidate.target === "nickname" &&
    candidate.route === "/api/nicknames/by-id" &&
    typeof candidate.value === "number"
  ) {
    return { target: "nickname", route: "/api/nicknames/by-id", value: candidate.value };
  }
  if (
    candidate.target === "nickname" &&
    candidate.route === "/api/nicknames/search" &&
    typeof candidate.value === "string"
  ) {
    return { target: "nickname", route: "/api/nicknames/search", value: candidate.value };
  }
  return null;
}

function loadSearchState(): SearchPageStateSnapshot {
  if (typeof window === "undefined") return DEFAULT_SEARCH_STATE;
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY);
    if (!raw) return DEFAULT_SEARCH_STATE;
    const parsed = JSON.parse(raw) as Partial<SearchPageStateSnapshot>;
    const selectedRange = Number(parsed.selectedRange);
    return {
      target: parsed.target === "nickname" ? "nickname" : "ingredient",
      ingredientMode: parsed.ingredientMode === "range" || parsed.ingredientMode === "ids" ? parsed.ingredientMode : "keyword",
      keywordInput: typeof parsed.keywordInput === "string" ? parsed.keywordInput : "",
      selectedRange: Number.isInteger(selectedRange) && selectedRange > 0 ? selectedRange : 1000,
      idsInput: typeof parsed.idsInput === "string" ? parsed.idsInput : "",
      nicknameIngredientId: typeof parsed.nicknameIngredientId === "string" ? parsed.nicknameIngredientId : "",
      nicknameIdInput: typeof parsed.nicknameIdInput === "string" ? parsed.nicknameIdInput : "",
      nicknameKeywordInput: typeof parsed.nicknameKeywordInput === "string" ? parsed.nicknameKeywordInput : "",
      searchRequest: normalizeSearchRequest(parsed.searchRequest),
    };
  } catch {
    return DEFAULT_SEARCH_STATE;
  }
}

export default function SearchPage() {
  const { toast } = useToast();
  const initialState = useMemo(loadSearchState, []);

  const [target, setTarget] = useState<SearchTarget>(initialState.target);
  const [ingredientMode, setIngredientMode] = useState<IngredientSearchMode>(initialState.ingredientMode);
  const [keywordInput, setKeywordInput] = useState(initialState.keywordInput);
  const [selectedRange, setSelectedRange] = useState<number>(initialState.selectedRange);
  const [idsInput, setIdsInput] = useState(initialState.idsInput);
  const [nicknameIngredientId, setNicknameIngredientId] = useState(initialState.nicknameIngredientId);
  const [nicknameIdInput, setNicknameIdInput] = useState(initialState.nicknameIdInput);
  const [nicknameKeywordInput, setNicknameKeywordInput] = useState(initialState.nicknameKeywordInput);
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(initialState.searchRequest);

  const [editItem, setEditItem] = useState<FoodItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [nicknameDeleteId, setNicknameDeleteId] = useState<number | null>(null);
  const [nicknameEditItem, setNicknameEditItem] = useState<NicknameItem | null>(null);
  const [nicknameEditOpen, setNicknameEditOpen] = useState(false);
  const [nicknameEditSynonym, setNicknameEditSynonym] = useState("");
  const [nicknameEditLangCode, setNicknameEditLangCode] = useState("ko");

  const activeQueryKey = searchRequest
    ? ([searchRequest.route, searchRequest.value] as const)
    : (["/api/search", ""] as const);

  const { data: rawResults, isLoading, isFetching } = useQuery<SearchResultItem[]>({
    queryKey: activeQueryKey,
    enabled: searchRequest !== null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: SearchPageStateSnapshot = {
      target,
      ingredientMode,
      keywordInput,
      selectedRange,
      idsInput,
      nicknameIngredientId,
      nicknameIdInput,
      nicknameKeywordInput,
      searchRequest,
    };
    sessionStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(payload));
  }, [target, ingredientMode, keywordInput, selectedRange, idsInput, nicknameIngredientId, nicknameIdInput, nicknameKeywordInput, searchRequest]);

  const results = rawResults ?? [];
  const parsedIds = useMemo(() => parseIdList(idsInput), [idsInput]);
  const parsedNicknameIngredientId = Number(nicknameIngredientId);
  const parsedNicknameId = Number(nicknameIdInput);

  const ingredientResults = useMemo(
    () =>
      searchRequest?.target === "ingredient"
        ? (results as FoodItem[])
        : [],
    [results, searchRequest],
  );

  const nicknameResults = useMemo(
    () =>
      searchRequest?.target === "nickname" &&
      (searchRequest.route === "/api/nicknames/by-ingredient" || searchRequest.route === "/api/nicknames/by-id")
        ? (results as NicknameItem[])
        : [],
    [results, searchRequest],
  );

  const nicknameSearchGroups = useMemo(
    () =>
      searchRequest?.target === "nickname" && searchRequest.route === "/api/nicknames/search"
        ? normalizeNicknameSearchGroups(results)
        : [],
    [results, searchRequest],
  );

  const currentQueryDescription = useMemo(() => {
    if (!searchRequest) return "";
    if (searchRequest.route === "/api/search") return `Ingredient keyword: "${searchRequest.value}"`;
    if (searchRequest.route === "/api/range") return `Ingredient range: ${searchRequest.value}-${searchRequest.value + 999}`;
    if (searchRequest.route === "/api/ingredients") return `Ingredient IDs: ${searchRequest.value.join(", ")}`;
    if (searchRequest.route === "/api/nicknames/by-id") return `Nickname ID: ${searchRequest.value}`;
    if (searchRequest.route === "/api/nicknames/search") return `Nickname keyword: "${searchRequest.value}"`;
    return `Nickname ingredient_id: ${searchRequest.value}`;
  }, [searchRequest]);

  const hasVisibleResults = useMemo(() => {
    if (!searchRequest) return false;
    if (searchRequest.target === "ingredient") return ingredientResults.length > 0;
    if (searchRequest.route === "/api/nicknames/by-ingredient" || searchRequest.route === "/api/nicknames/by-id") {
      return nicknameResults.length > 0;
    }
    return nicknameSearchGroups.some((group) => (group.data?.length ?? 0) > 0);
  }, [searchRequest, ingredientResults, nicknameResults, nicknameSearchGroups]);

  const runKeywordSearch = () => {
    const term = keywordInput.trim();
    if (!term) return;
    setSearchRequest({ target: "ingredient", route: "/api/search", value: term });
  };

  const runRangeSearch = () => {
    setSearchRequest({ target: "ingredient", route: "/api/range", value: selectedRange });
  };

  const runIdsSearch = () => {
    if (parsedIds.length === 0) {
      toast({
        title: "Invalid IDs",
        description: "Enter one or more numeric IDs (comma or space separated).",
        variant: "destructive",
      });
      return;
    }
    setSearchRequest({ target: "ingredient", route: "/api/ingredients", value: parsedIds });
  };

  const runNicknameSearch = () => {
    if (!Number.isInteger(parsedNicknameIngredientId) || parsedNicknameIngredientId <= 0) {
      toast({
        title: "Invalid ingredient_id",
        description: "Enter a valid numeric ingredient_id.",
        variant: "destructive",
      });
      return;
    }
    setSearchRequest({
      target: "nickname",
      route: "/api/nicknames/by-ingredient",
      value: parsedNicknameIngredientId,
    });
  };

  const runNicknameByIdSearch = () => {
    if (!Number.isInteger(parsedNicknameId) || parsedNicknameId <= 0) {
      toast({
        title: "Invalid nickname id",
        description: "Enter a valid numeric nickname id.",
        variant: "destructive",
      });
      return;
    }
    setSearchRequest({
      target: "nickname",
      route: "/api/nicknames/by-id",
      value: parsedNicknameId,
    });
  };

  const runNicknameKeywordSearch = () => {
    const keyword = nicknameKeywordInput.trim();
    if (!keyword) {
      toast({
        title: "Invalid nickname",
        description: "Enter nickname keyword.",
        variant: "destructive",
      });
      return;
    }
    setSearchRequest({
      target: "nickname",
      route: "/api/nicknames/search",
      value: keyword,
    });
  };

  const invalidateCurrentSearch = () => {
    if (!searchRequest) return;
    queryClient.invalidateQueries({
      queryKey: [searchRequest.route, searchRequest.value],
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", "/api/ingredient", { id });
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Item has been removed successfully." });
      invalidateCurrentSearch();
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const patchMutation = useMutation({
    mutationFn: async (data: { id: number; master_name?: string; label?: string; names?: Record<string, string> }) => {
      await apiRequest("PATCH", "/api/fooditem", data);
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Item has been updated successfully." });
      invalidateCurrentSearch();
      setEditOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteNicknameMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", "/api/nickname", { ids: [id] });
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Nickname has been removed successfully." });
      invalidateCurrentSearch();
      setNicknameDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const patchNicknameMutation = useMutation({
    mutationFn: async (data: { id: number; synonym: string; lang_code: string }) => {
      await apiRequest("PATCH", "/api/nickname", [data]);
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Nickname has been updated successfully." });
      invalidateCurrentSearch();
      setNicknameEditOpen(false);
      setNicknameEditItem(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openNicknameEdit = (item: NicknameItem) => {
    if (!item.id) return;
    setNicknameEditItem(item);
    setNicknameEditSynonym(item.synonym ?? "");
    setNicknameEditLangCode(item.lang_code ?? "ko");
    setNicknameEditOpen(true);
  };

  const nicknameEditChanged = useMemo(() => {
    if (!nicknameEditItem) return false;
    return (
      nicknameEditSynonym.trim() !== String(nicknameEditItem.synonym ?? "").trim() ||
      nicknameEditLangCode.trim() !== String(nicknameEditItem.lang_code ?? "").trim()
    );
  }, [nicknameEditItem, nicknameEditSynonym, nicknameEditLangCode]);

  const canPatchNickname = Boolean(nicknameEditItem?.id) &&
    nicknameEditSynonym.trim().length > 0 &&
    nicknameEditLangCode.trim().length > 0 &&
    nicknameEditChanged &&
    !patchNicknameMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose ingredient or nickname search
        </p>
      </div>

      <Tabs
        value={target}
        onValueChange={(value) => {
          setTarget(value as SearchTarget);
          setSearchRequest(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-search-target">
          <TabsTrigger value="ingredient" data-testid="tab-search-target-ingredient">
            Ingredient
          </TabsTrigger>
          <TabsTrigger value="nickname" data-testid="tab-search-target-nickname">
            Nickname
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredient" className="space-y-4">
          <Tabs
            value={ingredientMode}
            onValueChange={(value) => {
              setIngredientMode(value as IngredientSearchMode);
              setSearchRequest(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-3" data-testid="tabs-search-mode">
              <TabsTrigger value="keyword" className="gap-2" data-testid="tab-search-keyword">
                <Search className="w-4 h-4" />
                Keyword
              </TabsTrigger>
              <TabsTrigger value="range" className="gap-2" data-testid="tab-search-range">
                <ListFilter className="w-4 h-4" />
                Range
              </TabsTrigger>
              <TabsTrigger value="ids" className="gap-2" data-testid="tab-search-ids">
                <Hash className="w-4 h-4" />
                IDs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keyword" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name (e.g. Onion, 양파)"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runKeywordSearch()}
                  className="flex-1"
                  data-testid="input-search-keyword"
                />
                <Button
                  onClick={runKeywordSearch}
                  disabled={!keywordInput.trim()}
                  data-testid="button-search-keyword"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="range" className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {RANGES.map((range) => (
                  <Button
                    key={range}
                    variant={selectedRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRange(range)}
                    data-testid={`button-select-range-${range}`}
                  >
                    {range}
                  </Button>
                ))}
              </div>
              <Button onClick={runRangeSearch} data-testid="button-search-range">
                <ListFilter className="w-4 h-4 mr-2" />
                Search Selected Range
              </Button>
            </TabsContent>

            <TabsContent value="ids" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter IDs (e.g. 1001, 1002, 8000)"
                  value={idsInput}
                  onChange={(e) => setIdsInput(sanitizeIdsInput(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && runIdsSearch()}
                  className="flex-1"
                  inputMode="numeric"
                  pattern="[0-9,\\s]*"
                  data-testid="input-search-ids"
                />
                <Button onClick={runIdsSearch} disabled={parsedIds.length === 0} data-testid="button-search-ids">
                  <Hash className="w-4 h-4 mr-2" />
                  Search IDs
                </Button>
              </div>
              {idsInput.trim().length > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-search-ids-preview">
                  Request body: [{parsedIds.join(", ")}]
                </p>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="nickname" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Search by ingredient ID</p>
              <div className="flex gap-2">
                <Input
                  placeholder="ingredient_id (e.g. 1001)"
                  value={nicknameIngredientId}
                  onChange={(e) => setNicknameIngredientId(sanitizeDigitInput(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && runNicknameSearch()}
                  inputMode="numeric"
                  className="flex-1"
                  data-testid="input-search-nickname-ingredient-id"
                />
                <Button
                  onClick={runNicknameSearch}
                  disabled={!nicknameIngredientId.trim()}
                  data-testid="button-search-nickname"
                >
                  <Tags className="w-4 h-4 mr-2" />
                  Search Nickname
                </Button>
              </div>
              <div className="h-px bg-border" />
              <p className="text-sm text-muted-foreground">Search by nickname keyword</p>
              <div className="flex gap-2">
                <Input
                  placeholder="nickname keyword (e.g. 적양파)"
                  value={nicknameKeywordInput}
                  onChange={(e) => setNicknameKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runNicknameKeywordSearch()}
                  className="flex-1"
                  data-testid="input-search-nickname-keyword"
                />
                <Button
                  onClick={runNicknameKeywordSearch}
                  disabled={!nicknameKeywordInput.trim()}
                  data-testid="button-search-nickname-keyword"
                >
                  <Tags className="w-4 h-4 mr-2" />
                  Search By Nickname
                </Button>
              </div>
              <div className="h-px bg-border" />
              <p className="text-sm text-muted-foreground">Search by nickname ID</p>
              <div className="flex gap-2">
                <Input
                  placeholder="nickname id (e.g. 40169)"
                  value={nicknameIdInput}
                  onChange={(e) => setNicknameIdInput(sanitizeDigitInput(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && runNicknameByIdSearch()}
                  inputMode="numeric"
                  className="flex-1"
                  data-testid="input-search-nickname-id"
                />
                <Button
                  onClick={runNicknameByIdSearch}
                  disabled={!nicknameIdInput.trim()}
                  data-testid="button-search-nickname-id"
                >
                  <Hash className="w-4 h-4 mr-2" />
                  Search By ID
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-48 mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && searchRequest && !hasVisibleResults && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">{currentQueryDescription}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !searchRequest && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {target === "ingredient"
                ? "Choose an ingredient search mode and press Search"
                : "Enter ingredient_id, nickname keyword, or nickname ID and search"}
            </p>
          </CardContent>
        </Card>
      )}

      {searchRequest?.target === "ingredient" && (
        <div className="space-y-2">
          {ingredientResults.map((item) => (
            <Card key={item.id} className="hover-elevate" data-testid={`card-item-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-mono text-xs" data-testid={`badge-id-${item.id}`}>
                        ID: {item.id}
                      </Badge>
                      {item.label && (
                        <Badge variant="outline" className="text-xs uppercase" data-testid={`badge-label-${item.id}`}>
                          {item.label}
                        </Badge>
                      )}
                      <span className="font-semibold text-base" data-testid={`text-name-${item.id}`}>
                        {item.master_name}
                      </span>
                    </div>
                    {item.names && (
                      <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1 flex-wrap">
                        <span className="font-medium">Names:</span>
                        {Object.entries(item.names).map(([lang, name]) => (
                          <Badge key={lang} variant="outline" className="text-xs">
                            {lang}: {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditItem(item);
                        setEditOpen(true);
                      }}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(item.id)}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchRequest?.target === "nickname" &&
        (searchRequest.route === "/api/nicknames/by-ingredient" || searchRequest.route === "/api/nicknames/by-id") &&
        nicknameResults.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="w-28">Ingredient ID</TableHead>
                  <TableHead className="w-24">Lang</TableHead>
                  <TableHead>Synonym</TableHead>
                  <TableHead className="w-48">Created At</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nicknameResults.map((item, index) => (
                  <TableRow key={`${item.id ?? "noid"}-${index}`}>
                    <TableCell className="font-mono text-xs">{item.id ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{item.ingredient_id ?? "-"}</TableCell>
                    <TableCell>{item.lang_code ?? "-"}</TableCell>
                    <TableCell>{item.synonym ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.created_at ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={!item.id}
                          onClick={() => openNicknameEdit(item)}
                          data-testid={`button-edit-nickname-${item.id ?? index}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={!item.id}
                          onClick={() => item.id && setNicknameDeleteId(item.id)}
                          data-testid={`button-delete-nickname-${item.id ?? index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {searchRequest?.target === "nickname" &&
        searchRequest.route === "/api/nicknames/search" &&
        nicknameSearchGroups.some((group) => (group.data?.length ?? 0) > 0) && (
          <div className="space-y-2">
            {nicknameSearchGroups
              .filter((group) => (group.data?.length ?? 0) > 0)
              .map((group, groupIndex) => (
              <Card
                key={`${group.ingredient_id ?? "unknown"}-${groupIndex}`}
                className="hover-elevate"
                data-testid={`card-nickname-search-group-${group.ingredient_id ?? groupIndex}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-xs">
                      ingredient_id: {group.ingredient_id ?? "-"}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      count: {group.count ?? group.data?.length ?? 0}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead className="w-28">Ingredient ID</TableHead>
                        <TableHead className="w-24">Lang</TableHead>
                        <TableHead>Synonym</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(group.data ?? []).map((item, index) => (
                        <TableRow key={`${item.id ?? "noid"}-${index}`}>
                          <TableCell className="font-mono text-xs">{item.id ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{item.ingredient_id ?? "-"}</TableCell>
                          <TableCell>{item.lang_code ?? "-"}</TableCell>
                          <TableCell>{item.synonym ?? "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={!item.id}
                                onClick={() => openNicknameEdit(item)}
                                data-testid={`button-edit-nickname-search-${item.id ?? index}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={!item.id}
                                onClick={() => item.id && setNicknameDeleteId(item.id)}
                                data-testid={`button-delete-nickname-search-${item.id ?? index}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {isFetching && !isLoading && (
        <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Refreshing...</span>
        </div>
      )}

      <EditFoodDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(data) => patchMutation.mutate(data)}
        isPending={patchMutation.isPending}
      />

      <Dialog open={nicknameEditOpen} onOpenChange={setNicknameEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Nickname</DialogTitle>
            <DialogDescription>
              Modify nickname ID: {nicknameEditItem?.id ?? "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={nicknameEditLangCode} onValueChange={setNicknameEditLangCode}>
                <SelectTrigger data-testid="select-edit-nickname-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICKNAME_LANGS.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Synonym</Label>
              <Input
                value={nicknameEditSynonym}
                onChange={(e) => setNicknameEditSynonym(e.target.value)}
                data-testid="input-edit-nickname-synonym"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNicknameEditOpen(false)} data-testid="button-cancel-edit-nickname">
              Cancel
            </Button>
            <Button
              onClick={() =>
                nicknameEditItem?.id &&
                patchNicknameMutation.mutate({
                  id: nicknameEditItem.id,
                  lang_code: nicknameEditLangCode,
                  synonym: nicknameEditSynonym.trim(),
                })
              }
              disabled={!canPatchNickname}
              data-testid="button-save-edit-nickname"
            >
              {patchNicknameMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Patch Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete item ID: {deleteId}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={nicknameDeleteId !== null} onOpenChange={(open) => { if (!open) setNicknameDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Nickname</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete nickname ID: {nicknameDeleteId}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-nickname">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nicknameDeleteId !== null && deleteNicknameMutation.mutate(nicknameDeleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-nickname"
            >
              {deleteNicknameMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
