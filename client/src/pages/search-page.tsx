import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Edit3, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editItem, setEditItem] = useState<FoodItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: results, isLoading, isFetching } = useQuery<FoodItem[]>({
    queryKey: ["/api/search", searchTerm],
    enabled: searchTerm.length > 0,
  });

  const handleSearch = () => {
    if (query.trim()) {
      setSearchTerm(query.trim());
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", "/api/ingredient", { id });
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Item has been removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/search", searchTerm] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/search", searchTerm] });
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
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Search Ingredients</h1>
        <p className="text-sm text-muted-foreground mt-1">Find food items by name or nickname</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search by name (e.g. Onion, 양파)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
          data-testid="input-search"
        />
        <Button onClick={handleSearch} disabled={!query.trim()} data-testid="button-search">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

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

      {!isLoading && results && results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No results found for "{searchTerm}"</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Enter a search term to find ingredients</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {results?.map((item) => (
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
