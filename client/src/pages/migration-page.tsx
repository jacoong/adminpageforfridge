import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const DIGIT_OPTIONS = ["1000", "2000", "3000", "4000", "5000", "6000", "7000", "8000", "9000"] as const;
const LANG_OPTIONS = ["ko", "en", "ja", "zh", "fr", "es", "it", "de", "vi", "th"] as const;
type LangCode = (typeof LANG_OPTIONS)[number];

type NewFoodRow = {
  rowId: string;
  source_id: string;
  target_digit_number: string;
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

function createNewFoodRow(): NewFoodRow {
  return {
    rowId: `new-food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source_id: "",
    target_digit_number: "1000",
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

export default function MigrationPage() {
  const { toast } = useToast();

  const [newFoodRows, setNewFoodRows] = useState<NewFoodRow[]>([createNewFoodRow()]);
  const [nicknameRows, setNicknameRows] = useState<NicknameRow[]>([createNicknameRow()]);

  const newFoodPayload = useMemo(
    () =>
      newFoodRows
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
        ),
    [newFoodRows],
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
        const digit = Number(row.target_digit_number);
        return !(Number.isInteger(sourceId) && sourceId > 0 && Number.isInteger(digit) && digit > 0);
      }),
    [newFoodRows],
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
    mutationFn: async () => {
      await apiRequest("POST", "/api/migration/newfood", newFoodPayload);
    },
    onSuccess: () => {
      toast({
        title: "Migration Complete",
        description: `${newFoodPayload.length} row(s) sent to migrationNewFood.`,
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
        description: `${nicknamePayload.length} row(s) sent to migrationIngredientToNickname.`,
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
            POST <code>/migrationNewFood</code> body: [{"{"}"source_id":3211,"target_digit_number":5000{"}"}]
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">source_id</TableHead>
                <TableHead className="w-60">target_digit_number</TableHead>
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newFoodRows.map((row) => (
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
                    <Select
                      value={row.target_digit_number}
                      onValueChange={(value) =>
                        setNewFoodRows((prev) =>
                          prev.map((item) =>
                            item.rowId === row.rowId ? { ...item, target_digit_number: value } : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger data-testid={`select-migration-newfood-digit-${row.rowId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIGIT_OPTIONS.map((digit) => (
                          <SelectItem key={digit} value={digit}>
                            {digit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewFoodRows((prev) => [...prev, createNewFoodRow()])}
              data-testid="button-add-migration-newfood-row"
            >
              <Plus className="w-4 h-4 mr-2" />
              +추가하기
            </Button>
            <Button
              type="button"
              onClick={() => migrationNewFoodMutation.mutate()}
              disabled={!canSubmitNewFood || migrationNewFoodMutation.isPending}
              data-testid="button-submit-migration-newfood"
            >
              {migrationNewFoodMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Execute Migration
            </Button>
          </div>

          <p className="text-xs text-muted-foreground" data-testid="text-migration-newfood-body-preview">
            Request body: {JSON.stringify(newFoodPayload)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            ingredient 를 nickname 으로 이전
          </CardTitle>
          <CardDescription>
            POST <code>/migrationIngredientToNickname</code> body: [{"{"}"source_id":3213,"ingredient_id":1001,"lang_code":"ko","synonym":"test"{"}"}]
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
