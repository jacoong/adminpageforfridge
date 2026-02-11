import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightLeft, ArrowDown, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export default function MigrationPage() {
  const { toast } = useToast();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [synonym, setSynonym] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/migration", {
        source_id: Number(sourceId),
        ingredient_id: Number(targetId),
        lang_code: "ko",
        synonym: synonym || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Migration Complete", description: `Item ${sourceId} has been merged into ${targetId}.` });
      setSourceId("");
      setTargetId("");
      setSynonym("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = sourceId.trim().length > 0 && targetId.trim().length > 0;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Migration / Merge</h1>
        <p className="text-sm text-muted-foreground mt-1">Merge duplicate ingredients into a single canonical item</p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Destructive Operation</AlertTitle>
        <AlertDescription>
          This will delete the source ingredient and optionally add its name as a nickname to the target ingredient.
          This action cannot be undone.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Ingredient Merge
          </CardTitle>
          <CardDescription>
            Remove the source item and transfer its identity as a nickname to the target item.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-id" className="text-destructive font-medium">
              Source ID (will be deleted)
            </Label>
            <Input
              id="source-id"
              type="number"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="e.g. 9005 (temporary item)"
              data-testid="input-source-id"
            />
          </div>

          <div className="flex justify-center py-1">
            <div className="flex flex-col items-center text-muted-foreground gap-1">
              <ArrowDown className="w-5 h-5" />
              <span className="text-xs">merges into</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-id" className="text-chart-2 font-medium">
              Target ID (will receive nickname)
            </Label>
            <Input
              id="target-id"
              type="number"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="e.g. 1001 (canonical item)"
              data-testid="input-target-id"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="synonym-optional">Nickname (optional)</Label>
            <Input
              id="synonym-optional"
              value={synonym}
              onChange={(e) => setSynonym(e.target.value)}
              placeholder="Leave empty to use original name"
              data-testid="input-synonym"
            />
            <p className="text-xs text-muted-foreground">
              If left empty, the source item's original name will be used as the nickname.
            </p>
          </div>

          <Button
            className="w-full"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit}
            data-testid="button-merge"
          >
            Execute Merge
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Migration</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete item #{sourceId} and merge it as a nickname into item #{targetId}.
              Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-merge">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                mutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-merge"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
