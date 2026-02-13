import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { FOOD_LABELS, type FoodItem } from "@shared/schema";

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
  const [names, setNames] = useState<Record<LanguageCode, string>>(createEmptyNamesMap);

  const original = useMemo(() => {
    if (!item) return null;
    const originalNames = LANGUAGE_CODES.reduce(
      (acc, code) => {
        acc[code] = String(item.names?.[code] ?? "");
        return acc;
      },
      {} as Record<LanguageCode, string>,
    );

    return {
      masterName: String(item.master_name ?? ""),
      label: String(item.label ?? ""),
      names: originalNames,
    };
  }, [item]);

  const labelOptions = useMemo(() => {
    const base = [...FOOD_LABELS];
    if (original?.label && !base.includes(original.label as (typeof FOOD_LABELS)[number])) {
      return [...base, original.label];
    }
    return base;
  }, [original?.label]);

  useEffect(() => {
    if (!original) return;
    setMasterName(original.masterName);
    setLabel(original.label);
    setNames(original.names);
  }, [original]);

  const hasChanges = useMemo(() => {
    if (!original) return false;
    if (masterName.trim() !== original.masterName.trim()) return true;
    if (label.trim() !== original.label.trim()) return true;
    return LANGUAGE_CODES.some(
      (code) => names[code].trim() !== original.names[code].trim(),
    );
  }, [masterName, label, names, original]);

  const isComplete = useMemo(() => {
    if (!masterName.trim()) return false;
    if (!label.trim()) return false;
    return LANGUAGE_CODES.every((code) => names[code].trim().length > 0);
  }, [masterName, label, names]);

  const canSave = Boolean(item) && hasChanges && isComplete && !isPending;

  const handleSubmit = () => {
    if (!item || !canSave) return;
    onSave({
      id: item.id,
      master_name: masterName.trim(),
      label: label.trim(),
      names: normalizeNamesMap(names),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
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
            <Select
              value={label || undefined}
              onValueChange={setLabel}
            >
              <SelectTrigger id="edit-label" data-testid="select-edit-label">
                <SelectValue placeholder="Select label" />
              </SelectTrigger>
              <SelectContent>
                {labelOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Localized Names (Required)</Label>
            <div className="grid grid-cols-2 gap-4">
              {LANGUAGE_CODES.map((code) => (
                <div key={code} className="space-y-2">
                  <Label htmlFor={`edit-name-${code}`}>{LANGUAGE_LABELS[code]}</Label>
                  <Input
                    id={`edit-name-${code}`}
                    value={names[code]}
                    onChange={(e) =>
                      setNames((prev) => ({
                        ...prev,
                        [code]: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${code} value`}
                    data-testid={`input-edit-name-${code}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave} data-testid="button-save-edit">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Patch Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
