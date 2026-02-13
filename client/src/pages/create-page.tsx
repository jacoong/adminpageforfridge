import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2, Utensils, HelpCircle, ChefHat, Trash2, BookmarkPlus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type CrudTab = "create" | "delete";
type EntityType = "ingredient" | "nickname";
type FoodType = "standard" | "mystery" | "cuisine";

const STANDARD_DIGIT_RANGES = [
  "1000",
  "2000",
  "3000",
  "4000",
  "5000",
  "6000",
  "7000",
  "8000",
  "9000",
] as const;

const STANDARD_LABELS = [
  "egg",
  "fish",
  "seafood",
  "meat",
  "poultry",
  "processed_meat",
  "dairy",
  "cheese",
  "yogurt",
  "vegetable",
  "fruit",
  "legume",
  "nut",
  "seed",
  "grain",
  "rice",
  "noodle",
  "bread",
  "oil",
  "sauce",
  "spice",
  "raw",
  "cooked",
  "fermented",
  "snack",
  "dessert",
  "beverage",
  "leftover",
  "other",
] as const;

type StandardLabel = (typeof STANDARD_LABELS)[number];

const LANGUAGE_CODES = [
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

type LanguageCode = (typeof LANGUAGE_CODES)[number];

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ko: "Korean (ko)",
  en: "English (en)",
  ja: "Japanese (ja)",
  zh: "Chinese (zh)",
  fr: "French (fr)",
  es: "Spanish (es)",
  it: "Italian (it)",
  de: "German (de)",
  vi: "Vietnamese (vi)",
  th: "Thai (th)",
};

function createEmptyNamesMap(): Record<LanguageCode, string> {
  return LANGUAGE_CODES.reduce(
    (acc, code) => {
      acc[code] = "";
      return acc;
    },
    {} as Record<LanguageCode, string>,
  );
}

function normalizeNamesMap(
  names: Record<LanguageCode, string>,
): Record<LanguageCode, string> {
  return LANGUAGE_CODES.reduce(
    (acc, code) => {
      acc[code] = names[code].trim();
      return acc;
    },
    {} as Record<LanguageCode, string>,
  );
}

function buildAutoNamesMap(masterName: string): Record<LanguageCode, string> {
  const normalized = masterName.trim();
  return LANGUAGE_CODES.reduce(
    (acc, code) => {
      acc[code] = normalized;
      return acc;
    },
    {} as Record<LanguageCode, string>,
  );
}

function sanitizeDigitInput(input: string): string {
  return input.replace(/[^\d]/g, "");
}

function sanitizeIdsInput(input: string): string {
  return input.replace(/[^\d,\s]/g, "");
}

function parseIdList(input: string): number[] {
  const unique = new Set<number>();

  input
    .split(/[\s,]+/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .forEach((id) => unique.add(id));

  return Array.from(unique);
}

export default function CreatePage() {
  const { toast } = useToast();

  const [crudTab, setCrudTab] = useState<CrudTab>("create");
  const [createEntity, setCreateEntity] = useState<EntityType>("ingredient");
  const [deleteEntity, setDeleteEntity] = useState<EntityType>("ingredient");

  const [type, setType] = useState<FoodType>("standard");
  const [digitNumber, setDigitNumber] = useState("1000");
  const [label, setLabel] = useState<StandardLabel>("vegetable");
  const [masterName, setMasterName] = useState("");
  const [names, setNames] = useState<Record<LanguageCode, string>>(createEmptyNamesMap);

  const [nicknameIngredientId, setNicknameIngredientId] = useState("");
  const [nicknameLangCode, setNicknameLangCode] = useState<LanguageCode>("ko");
  const [nicknameSynonym, setNicknameSynonym] = useState("");

  const [ingredientDeleteIdsInput, setIngredientDeleteIdsInput] = useState("");
  const [nicknameDeleteIdsInput, setNicknameDeleteIdsInput] = useState("");

  const updateCreateName = (code: LanguageCode, value: string) => {
    setNames((prev) => ({ ...prev, [code]: value }));
  };

  const createIngredientMutation = useMutation({
    mutationFn: async () => {
      const normalizedMasterName = masterName.trim();

      const payload =
        type === "standard"
          ? {
              type,
              digitNumber: Number(digitNumber),
              label,
              masterName: normalizedMasterName,
              names: normalizeNamesMap(names),
            }
          : {
              type,
              digitNumber: type === "mystery" ? 9000 : 8000,
              masterName: normalizedMasterName,
              names: buildAutoNamesMap(normalizedMasterName),
            };

      await apiRequest("POST", "/api/food", payload);
    },
    onSuccess: () => {
      toast({ title: "Created", description: `"${masterName}" has been created successfully.` });
      setMasterName("");
      setNames(createEmptyNamesMap());
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createNicknameMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/nickname", {
        ingredient_id: Number(nicknameIngredientId),
        lang_code: nicknameLangCode,
        synonym: nicknameSynonym.trim(),
      });
    },
    onSuccess: () => {
      toast({ title: "Nickname Added", description: "Nickname has been added successfully." });
      setNicknameSynonym("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const parsedIngredientDeleteIds = useMemo(
    () => parseIdList(ingredientDeleteIdsInput),
    [ingredientDeleteIdsInput],
  );
  const parsedNicknameDeleteIds = useMemo(
    () => parseIdList(nicknameDeleteIdsInput),
    [nicknameDeleteIdsInput],
  );

  const deleteIngredientMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/ingredient", { ids: parsedIngredientDeleteIds });
    },
    onSuccess: () => {
      toast({
        title: "Ingredients Deleted",
        description: `${parsedIngredientDeleteIds.length} ingredient(s) deleted successfully.`,
      });
      setIngredientDeleteIdsInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteNicknameMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/nickname", { ids: parsedNicknameDeleteIds });
    },
    onSuccess: () => {
      toast({
        title: "Nicknames Deleted",
        description: `${parsedNicknameDeleteIds.length} nickname(s) deleted successfully.`,
      });
      setNicknameDeleteIdsInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmitIngredientCreate = useMemo(() => {
    if (!masterName.trim()) return false;
    if (type !== "standard") return true;
    return LANGUAGE_CODES.every((code) => names[code].trim().length > 0);
  }, [masterName, type, names]);

  const canSubmitNicknameCreate =
    nicknameIngredientId.trim().length > 0 &&
    nicknameSynonym.trim().length > 0;

  const canDeleteIngredients = parsedIngredientDeleteIds.length > 0;
  const canDeleteNicknames = parsedNicknameDeleteIds.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Create / Delete
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage ingredient and nickname payloads
        </p>
      </div>

      <Tabs value={crudTab} onValueChange={(value) => setCrudTab(value as CrudTab)}>
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-crud-type">
          <TabsTrigger value="create" data-testid="tab-crud-create">Create</TabsTrigger>
          <TabsTrigger value="delete" data-testid="tab-crud-delete">Delete</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Tabs value={createEntity} onValueChange={(value) => setCreateEntity(value as EntityType)}>
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-create-entity">
              <TabsTrigger value="ingredient" data-testid="tab-create-ingredient">Ingredient</TabsTrigger>
              <TabsTrigger value="nickname" data-testid="tab-create-nickname">Nickname</TabsTrigger>
            </TabsList>

            <TabsContent value="ingredient" className="space-y-4">
              <Tabs value={type} onValueChange={(value) => setType(value as FoodType)}>
                <TabsList className="grid w-full grid-cols-3" data-testid="tabs-food-type">
                  <TabsTrigger value="standard" className="gap-2" data-testid="tab-standard">
                    <Utensils className="w-4 h-4" />
                    Standard
                  </TabsTrigger>
                  <TabsTrigger value="mystery" className="gap-2" data-testid="tab-mystery">
                    <HelpCircle className="w-4 h-4" />
                    Mystery
                  </TabsTrigger>
                  <TabsTrigger value="cuisine" className="gap-2" data-testid="tab-cuisine">
                    <ChefHat className="w-4 h-4" />
                    Cuisine
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="standard">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Standard Ingredient</CardTitle>
                      <CardDescription>Digit + label + master_name + all names required</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Digit Range</Label>
                          <Select value={digitNumber} onValueChange={setDigitNumber}>
                            <SelectTrigger data-testid="select-digit-number">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STANDARD_DIGIT_RANGES.map((range) => (
                                <SelectItem key={range} value={range}>
                                  {range} Range
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Select value={label} onValueChange={(value) => setLabel(value as StandardLabel)}>
                            <SelectTrigger data-testid="select-label">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STANDARD_LABELS.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <MasterNameField masterName={masterName} setMasterName={setMasterName} />
                      <LocalizedNamesFields names={names} onNameChange={updateCreateName} />
                      <Button
                        className="w-full"
                        onClick={() => createIngredientMutation.mutate()}
                        disabled={!canSubmitIngredientCreate || createIngredientMutation.isPending}
                        data-testid="button-create-ingredient"
                      >
                        {createIngredientMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Standard Ingredient
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="mystery">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mystery Ingredient</CardTitle>
                      <CardDescription>Label is fixed to "mistery", range is fixed to 9000.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Digit Range</Label>
                          <Input value="9000" disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input value="mistery" disabled />
                        </div>
                      </div>
                      <MasterNameField masterName={masterName} setMasterName={setMasterName} />
                      <p className="text-xs text-muted-foreground">
                        All language names will be auto-filled from master name.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => createIngredientMutation.mutate()}
                        disabled={!canSubmitIngredientCreate || createIngredientMutation.isPending}
                        data-testid="button-create-mystery"
                      >
                        {createIngredientMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Mystery Ingredient
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="cuisine">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cuisine Ingredient</CardTitle>
                      <CardDescription>Range is fixed to 8000, names auto-filled from master name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Digit Range</Label>
                          <Input value="8000" disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input value="cuisine" disabled />
                        </div>
                      </div>
                      <MasterNameField masterName={masterName} setMasterName={setMasterName} />
                      <Button
                        className="w-full"
                        onClick={() => createIngredientMutation.mutate()}
                        disabled={!canSubmitIngredientCreate || createIngredientMutation.isPending}
                        data-testid="button-create-cuisine"
                      >
                        {createIngredientMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Cuisine Ingredient
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="nickname">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookmarkPlus className="w-5 h-5" />
                    Create Nickname
                  </CardTitle>
                  <CardDescription>Add nickname for an existing ingredient</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ingredient ID</Label>
                    <Input
                      value={nicknameIngredientId}
                      onChange={(e) => setNicknameIngredientId(sanitizeDigitInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="e.g. 1001"
                      data-testid="input-create-nickname-ingredient-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={nicknameLangCode}
                      onValueChange={(value) => setNicknameLangCode(value as LanguageCode)}
                    >
                      <SelectTrigger data-testid="select-create-nickname-lang">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {LANGUAGE_LABELS[code]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Synonym</Label>
                    <Input
                      value={nicknameSynonym}
                      onChange={(e) => setNicknameSynonym(e.target.value)}
                      placeholder="e.g. 양파깍두기"
                      data-testid="input-create-nickname-synonym"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createNicknameMutation.mutate()}
                    disabled={!canSubmitNicknameCreate || createNicknameMutation.isPending}
                    data-testid="button-create-nickname"
                  >
                    {createNicknameMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create Nickname
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="delete" className="space-y-4">
          <Tabs value={deleteEntity} onValueChange={(value) => setDeleteEntity(value as EntityType)}>
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-delete-entity">
              <TabsTrigger value="ingredient" data-testid="tab-delete-ingredient">Ingredient</TabsTrigger>
              <TabsTrigger value="nickname" data-testid="tab-delete-nickname">Nickname</TabsTrigger>
            </TabsList>

            <TabsContent value="ingredient">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Delete Ingredients
                  </CardTitle>
                  <CardDescription>
                    Endpoint: <code>/delete/ingredient</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Ingredient IDs (comma separated)</Label>
                  <Input
                    value={ingredientDeleteIdsInput}
                    onChange={(e) => setIngredientDeleteIdsInput(sanitizeIdsInput(e.target.value))}
                    placeholder="e.g. 8000, 8001, 8002, 9001"
                    inputMode="numeric"
                    data-testid="input-delete-ingredient-ids"
                  />
                  {ingredientDeleteIdsInput.trim().length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-delete-ingredient-body-preview">
                      Request body: [{parsedIngredientDeleteIds.map((id) => `{"id":${id}}`).join(", ")}]
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => deleteIngredientMutation.mutate()}
                    disabled={!canDeleteIngredients || deleteIngredientMutation.isPending}
                    data-testid="button-delete-ingredients"
                  >
                    {deleteIngredientMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Delete Ingredients
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nickname">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Delete Nicknames
                  </CardTitle>
                  <CardDescription>
                    Endpoint: <code>/delete/nickName</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Nickname IDs (comma separated)</Label>
                  <Input
                    value={nicknameDeleteIdsInput}
                    onChange={(e) => setNicknameDeleteIdsInput(sanitizeIdsInput(e.target.value))}
                    placeholder="e.g. 40169, 40170"
                    inputMode="numeric"
                    data-testid="input-delete-nickname-ids"
                  />
                  {nicknameDeleteIdsInput.trim().length > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="text-delete-nickname-body-preview">
                      Request body: [{parsedNicknameDeleteIds.map((id) => `{"id":${id}}`).join(", ")}]
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => deleteNicknameMutation.mutate()}
                    disabled={!canDeleteNicknames || deleteNicknameMutation.isPending}
                    data-testid="button-delete-nicknames"
                  >
                    {deleteNicknameMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Delete Nicknames
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MasterNameField({
  masterName,
  setMasterName,
}: {
  masterName: string;
  setMasterName: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="master-name">Master Name</Label>
      <Input
        id="master-name"
        value={masterName}
        onChange={(e) => setMasterName(e.target.value)}
        placeholder="e.g. Garlic"
        data-testid="input-master-name"
      />
    </div>
  );
}

function LocalizedNamesFields({
  names,
  onNameChange,
}: {
  names: Record<LanguageCode, string>;
  onNameChange: (code: LanguageCode, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Localized Names (Required)</Label>
      <div className="grid grid-cols-2 gap-4">
        {LANGUAGE_CODES.map((code) => (
          <div key={code} className="space-y-2">
            <Label htmlFor={`name-${code}`}>{LANGUAGE_LABELS[code]}</Label>
            <Input
              id={`name-${code}`}
              value={names[code]}
              onChange={(e) => onNameChange(code, e.target.value)}
              placeholder={`Enter ${code} value`}
              data-testid={`input-name-${code}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
