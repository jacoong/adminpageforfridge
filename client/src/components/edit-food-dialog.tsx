import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { FoodItem } from "@shared/schema";

interface EditFoodDialogProps {
  item: FoodItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id: number; master_name?: string; label?: string; names?: Record<string, string> }) => void;
  isPending: boolean;
}

export function EditFoodDialog({ item, open, onOpenChange, onSave, isPending }: EditFoodDialogProps) {
  const [masterName, setMasterName] = useState("");
  const [label, setLabel] = useState("");
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");

  useEffect(() => {
    if (item) {
      setMasterName(item.master_name || "");
      setLabel(item.label || "");
      setKo(item.names?.ko || "");
      setEn(item.names?.en || "");
    }
  }, [item]);

  const handleSubmit = () => {
    if (!item) return;
    const payload: { id: number; master_name?: string; label?: string; names?: Record<string, string> } = {
      id: item.id,
    };
    if (masterName !== item.master_name) payload.master_name = masterName;
    if (label !== item.label) payload.label = label;
    const names: Record<string, string> = {};
    if (ko) names.ko = ko;
    if (en) names.en = en;
    if (Object.keys(names).length > 0) payload.names = names;
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Food Item</DialogTitle>
          <DialogDescription>
            Modify the details for ID: {item?.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-master-name">Master Name</Label>
            <Input
              id="edit-master-name"
              value={masterName}
              onChange={(e) => setMasterName(e.target.value)}
              data-testid="input-edit-master-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-label">Label</Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              data-testid="input-edit-label"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ko">Korean Name</Label>
              <Input
                id="edit-ko"
                value={ko}
                onChange={(e) => setKo(e.target.value)}
                data-testid="input-edit-ko"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-en">English Name</Label>
              <Input
                id="edit-en"
                value={en}
                onChange={(e) => setEn(e.target.value)}
                data-testid="input-edit-en"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-edit">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
