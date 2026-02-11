import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ListFilter, Edit3, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const RANGES = [1000, 2000, 3000, 4000, 5000, 8000, 9000];

export default function BrowsePage() {
  const [digit, setDigit] = useState(1000);
  const [editItem, setEditItem] = useState<FoodItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/range", digit],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", "/api/ingredient", { id });
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Item removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/range", digit] });
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
      toast({ title: "Updated", description: "Item updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/range", digit] });
      setEditOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Browse by Range</h1>
        <p className="text-sm text-muted-foreground mt-1">View food items organized by digit range</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {RANGES.map((r) => (
          <Button
            key={r}
            variant={digit === r ? "default" : "outline"}
            size="sm"
            onClick={() => setDigit(r)}
            className="toggle-elevate"
            data-testid={`button-range-${r}`}
          >
            {r}s
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListFilter className="w-5 h-5" />
              Range {digit} - {digit + 999}
            </CardTitle>
            <CardDescription>
              {isLoading ? "Loading..." : `${items?.length || 0} items found`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Master Name</TableHead>
                  <TableHead className="w-28">Label</TableHead>
                  <TableHead>Names</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                    <TableCell className="font-mono text-xs" data-testid={`text-row-id-${item.id}`}>
                      {item.id}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-row-name-${item.id}`}>
                      {item.master_name}
                    </TableCell>
                    <TableCell>
                      {item.label && (
                        <Badge variant="outline" className="text-xs uppercase">
                          {item.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.names ? (
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(item.names).map(([lang, name]) => (
                            <span key={lang}>{lang}: {name}</span>
                          ))}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditItem(item); setEditOpen(true); }}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <ListFilter className="w-10 h-10 mx-auto mb-3" />
              <p>No items in this range</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditFoodDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(data) => patchMutation.mutate(data)}
        isPending={patchMutation.isPending}
      />

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
    </div>
  );
}
