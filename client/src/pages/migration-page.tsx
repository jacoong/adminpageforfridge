import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FALLBACK_INGREDIENT_CATEGORIES,
  INGREDIENT_CATEGORIES_QUERY_KEY,
  fetchIngredientCategories,
  findIngredientCategory,
  formatCategoryOptionLabel,
  formatCategoryRange,
  type IngredientCategory,
} from "@/lib/ingredient-categories";

const LANG_OPTIONS = ["ko", "en", "ja", "zh", "fr", "es", "it", "de", "vi", "th"] as const;
type LangCode = (typeof LANG_OPTIONS)[number];

type NewFoodRow = {
  rowId: string;
  source_id: string;
  target_label: string;
};

type NicknameRow = {
  rowId: string;
  source_id: string;
  ingredient_id: string;
  lang_code: LangCode;
  synonym: string;
};

function sanitizeDigitInput(input: string): string {
  return input.replace(/[^\d]/g, "");
}

function createNewFoodRow(targetLabel: string): NewFoodRow {
  return {
    rowId: `new-food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source_id: "",
    target_label: targetLabel,
  };
}

function createNicknameRow(): NicknameRow {
  return {
    rowId: `nickname-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source_id: "",
    ingredient_id: "",
    lang_code: "ko",
    synonym: "",
  };
}

type NewFoodRequestRow = {
  source_id: number;
  target_label: string;
};

type NewFoodResultRow = {
  source_id?: number;
  target_label?: string;
  new_id: number;
};

function getDefaultCategory(categories: IngredientCategory[]): IngredientCategory {
  return categories[0] ?? FALLBACK_INGREDIENT_CATEGORIES[0];
}

function parseNewFoodResultRows(payload: unknown): NewFoodResultRow[] {
  let data: unknown = payload;

  if (data && typeof data === "object" && "data" in data) {
    data = (data as { data?: unknown }).data;
  }

  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];

  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const newId = Number(record.new_id);

      if (!Number.isInteger(newId) || newId <= 0) {
        return null;
      }

      const sourceId = Number(record.source_id);
      const targetLabel = typeof record.target_label === "string" ? record.target_label.trim() : undefined;

      return {
        source_id: Number.isInteger(sourceId) && sourceId > 0 ? sourceId : undefined,
        target_label: targetLabel || undefined,
        new_id: newId,
      };
    })
    .filter((item): item is NewFoodResultRow => item !== null);
}

export default function MigrationPage() {
  const { toast } = useToast();

  const { data: ingredientCategories = FALLBACK_INGREDIENT_CATEGORIES } = useQuery({
    queryKey: [...INGREDIENT_CATEGORIES_QUERY_KEY],
    queryFn: fetchIngredientCategories,
    initialData: FALLBACK_INGREDIENT_CATEGORIES,
  });

  const defaultCategory = getDefaultCategory(ingredientCategories);

  const [newFoodRows, setNewFoodRows] = useState<NewFoodRow[]>([
    createNewFoodRow(defaultCategory.label),
  ]);
  const [nicknameRows, setNicknameRows] = useState<NicknameRow[]>([createNicknameRow()]);
  const [newFoodResponse, setNewFoodResponse] = useState<unknown>(null);
  const [submittedNewFoodPayload, setSubmittedNewFoodPayload] = useState<NewFoodRequestRow[]>([]);

  const newFoodPayload = useMemo(
    () =>
      newFoodRows
        .map((row) => {
          const selectedCategory =
            findIngredientCategory(ingredientCategories, row.target_label) ?? defaultCategory;

          return {
            source_id: Number(row.source_id),
            target_label: selectedCategory.label,
          };
        })
        .filter(
          (row) =>
            Number.isInteger(row.source_id) &&
            row.source_id > 0 &&
            row.target_label.length > 0,
        ),
    [defaultCategory, ingredientCategories, newFoodRows],
  );

  const nicknamePayload = useMemo(
    () =>
      nicknameRows
        .map((row) => ({
          source_id: Number(row.source_id),
          ingredient_id: Number(row.ingredient_id),
          lang_code: row.lang_code,
          synonym: row.synonym.trim() || undefined,
        }))
        .filter(
          (row) =>
            Number.isInteger(row.source_id) &&
            row.source_id > 0 &&
            Number.isInteger(row.ingredient_id) &&
            row.ingredient_id > 0 &&
            row.lang_code.trim().length > 0,
        ),
    [nicknameRows],
  );

  const hasInvalidNewFoodRows = useMemo(
    () =>
      newFoodRows.some((row) => {
        const sourceId = Number(row.source_id);
        const selectedCategory =
          findIngredientCategory(ingredientCategories, row.target_label) ?? defaultCategory;
        return !(Number.isInteger(sourceId) && sourceId > 0 && selectedCategory);
      }),
    [defaultCategory, ingredientCategories, newFoodRows],
  );

  const hasInvalidNicknameRows = useMemo(
    () =>
      nicknameRows.some((row) => {
        const sourceId = Number(row.source_id);
        const ingredientId = Number(row.ingredient_id);
        return !(Number.isInteger(sourceId) && sourceId > 0 && Number.isInteger(ingredientId) && ingredientId > 0);
      }),
    [nicknameRows],
  );

  const migrationNewFoodMutation = useMutation({
    mutationFn: async (payload: NewFoodRequestRow[]) => {
      return apiRequest("POST", "/api/migration/newfood", payload);
    },
    onMutate: (payload) => {
      setSubmittedNewFoodPayload(payload);
      setNewFoodResponse(null);
    },
    onSuccess: (data, payload) => {
      setNewFoodResponse(data);
      toast({
        title: "Migration Complete",
        description: `${payload.length} row(s) processed successfully.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const migrationNicknameMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/migration", nicknamePayload);
    },
    onSuccess: () => {
      toast({
        title: "Migration Complete",
        description: `${nicknamePayload.length} row(s) processed successfully.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmitNewFood =
    newFoodRows.length > 0 &&
    newFoodPayload.length === newFoodRows.length &&
    !hasInvalidNewFoodRows;
  const canSubmitNickname =
    nicknameRows.length > 0 &&
    nicknamePayload.length === nicknameRows.length &&
    !hasInvalidNicknameRows;

  const newFoodResultRows = useMemo(() => {
    const parsedRows = parseNewFoodResultRows(newFoodResponse);

    return parsedRows.map((row, index) => ({
      source_id: row.source_id ?? submittedNewFoodPayload[index]?.source_id,
      target_label: row.target_label ?? submittedNewFoodPayload[index]?.target_label,
      new_id: row.new_id,
    }));
  }, [newFoodResponse, submittedNewFoodPayload]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Migration / Merge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-row migration payloads with +추가하기
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            x번대 id 를 y번대 id로 이전
          </CardTitle>
          <CardDescription>
            Source ID를 선택한 카테고리로 이전합니다. 요청은 `target_label` 기준으로 전송됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">source_id</TableHead>
                <TableHead className="w-80">target_category</TableHead>
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newFoodRows.map((row) => {
                const selectedCategory =
                  findIngredientCategory(ingredientCategories, row.target_label) ?? defaultCategory;

                return (
                  <TableRow key={row.rowId}>
                    <TableCell>
                      <Input
                        value={row.source_id}
                        onChange={(e) => {
                          const value = sanitizeDigitInput(e.target.value);
                          setNewFoodRows((prev) =>
                            prev.map((item) => (item.rowId === row.rowId ? { ...item, source_id: value } : item)),
                          );
                        }}
                        inputMode="numeric"
                        placeholder="3211"
                        data-testid={`input-migration-newfood-source-${row.rowId}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Select
                          value={selectedCategory.label}
                          onValueChange={(value) =>
                            setNewFoodRows((prev) =>
                              prev.map((item) =>
                                item.rowId === row.rowId ? { ...item, target_label: value } : item,
                              ),
                            )
                          }
                        >
                          <SelectTrigger data-testid={`select-migration-newfood-digit-${row.rowId}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredientCategories.map((category) => (
                              <SelectItem key={category.label} value={category.label}>
                                {formatCategoryOptionLabel(category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          start_id {selectedCategory.startId}, ids {formatCategoryRange(selectedCategory)}
                          {selectedCategory.examples ? `, 예시: ${selectedCategory.examples}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={newFoodRows.length === 1}
                        onClick={() =>
                          setNewFoodRows((prev) => prev.filter((item) => item.rowId !== row.rowId))
                        }
                        data-testid={`button-remove-migration-newfood-row-${row.rowId}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setNewFoodRows((prev) => [...prev, createNewFoodRow(defaultCategory.label)])
              }
              data-testid="button-add-migration-newfood-row"
            >
              <Plus className="w-4 h-4 mr-2" />
              +추가하기
            </Button>
            <Button
              type="button"
              onClick={() => migrationNewFoodMutation.mutate(newFoodPayload)}
              disabled={!canSubmitNewFood || migrationNewFoodMutation.isPending}
              data-testid="button-submit-migration-newfood"
            >
              {migrationNewFoodMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Execute Migration
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground" data-testid="text-migration-newfood-body-preview">
              Request body
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(newFoodPayload, null, 2)}
            </pre>
          </div>

          {newFoodResultRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Created IDs</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                {newFoodResultRows.map((row, index) => (
                  <p key={`${row.new_id}-${index}`}>
                    source {row.source_id ?? "-"} -&gt; {row.target_label ?? "-"} -&gt; new_id {row.new_id}
                  </p>
                ))}
              </div>
            </div>
          )}

          {newFoodResponse && newFoodResultRows.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Response</p>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(newFoodResponse, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            ingredient 를 nickname 으로 이전
          </CardTitle>
          <CardDescription>
            Source ID를 지정한 ingredient nickname으로 이전합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">source_id</TableHead>
                <TableHead className="w-40">ingredient_id</TableHead>
                <TableHead className="w-32">lang_code</TableHead>
                <TableHead>synonym (optional)</TableHead>
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nicknameRows.map((row) => (
                <TableRow key={row.rowId}>
                  <TableCell>
                    <Input
                      value={row.source_id}
                      onChange={(e) => {
                        const value = sanitizeDigitInput(e.target.value);
                        setNicknameRows((prev) =>
                          prev.map((item) => (item.rowId === row.rowId ? { ...item, source_id: value } : item)),
                        );
                      }}
                      inputMode="numeric"
                      placeholder="3213"
                      data-testid={`input-migration-nickname-source-${row.rowId}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.ingredient_id}
                      onChange={(e) => {
                        const value = sanitizeDigitInput(e.target.value);
                        setNicknameRows((prev) =>
                          prev.map((item) => (item.rowId === row.rowId ? { ...item, ingredient_id: value } : item)),
                        );
                      }}
                      inputMode="numeric"
                      placeholder="1001"
                      data-testid={`input-migration-nickname-ingredient-${row.rowId}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.lang_code}
                      onValueChange={(value) =>
                        setNicknameRows((prev) =>
                          prev.map((item) =>
                            item.rowId === row.rowId ? { ...item, lang_code: value as LangCode } : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger data-testid={`select-migration-nickname-lang-${row.rowId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANG_OPTIONS.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.synonym}
                      onChange={(e) =>
                        setNicknameRows((prev) =>
                          prev.map((item) => (item.rowId === row.rowId ? { ...item, synonym: e.target.value } : item)),
                        )
                      }
                      placeholder="testMigrationtoNickname"
                      data-testid={`input-migration-nickname-synonym-${row.rowId}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={nicknameRows.length === 1}
                      onClick={() =>
                        setNicknameRows((prev) => prev.filter((item) => item.rowId !== row.rowId))
                      }
                      data-testid={`button-remove-migration-nickname-row-${row.rowId}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNicknameRows((prev) => [...prev, createNicknameRow()])}
              data-testid="button-add-migration-nickname-row"
            >
              <Plus className="w-4 h-4 mr-2" />
              +추가하기
            </Button>
            <Button
              type="button"
              onClick={() => migrationNicknameMutation.mutate()}
              disabled={!canSubmitNickname || migrationNicknameMutation.isPending}
              data-testid="button-submit-migration-nickname"
            >
              {migrationNicknameMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Execute Migration
            </Button>
          </div>

          <p className="text-xs text-muted-foreground" data-testid="text-migration-nickname-body-preview">
            Request body: {JSON.stringify(nicknamePayload)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
