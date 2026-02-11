import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookmarkPlus, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function NicknamesPage() {
  const { toast } = useToast();
  const [ingredientId, setIngredientId] = useState("");
  const [langCode, setLangCode] = useState("ko");
  const [synonym, setSynonym] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/nickname", {
        ingredient_id: Number(ingredientId),
        lang_code: langCode,
        synonym,
      });
    },
    onSuccess: () => {
      toast({ title: "Nickname Added", description: `"${synonym}" has been added as a nickname.` });
      setSynonym("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = ingredientId.trim().length > 0 && synonym.trim().length > 0;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Add Nickname</h1>
        <p className="text-sm text-muted-foreground mt-1">Add an alternative name (nickname) to an existing food item</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5" />
            New Nickname
          </CardTitle>
          <CardDescription>
            A nickname is an alternative name that can be used to find the same ingredient during search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient-id">Ingredient ID</Label>
            <Input
              id="ingredient-id"
              type="number"
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              placeholder="e.g. 1001"
              data-testid="input-ingredient-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lang-code">Language</Label>
            <Select value={langCode} onValueChange={setLangCode}>
              <SelectTrigger data-testid="select-lang-code">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ko">Korean (ko)</SelectItem>
                <SelectItem value="en">English (en)</SelectItem>
                <SelectItem value="ja">Japanese (ja)</SelectItem>
                <SelectItem value="zh">Chinese (zh)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="synonym">Nickname / Synonym</Label>
            <Input
              id="synonym"
              value={synonym}
              onChange={(e) => setSynonym(e.target.value)}
              placeholder="e.g. 양파깍두기"
              data-testid="input-synonym"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            data-testid="button-add-nickname"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BookmarkPlus className="w-4 h-4 mr-2" />
            )}
            Add Nickname
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
