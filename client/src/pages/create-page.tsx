import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2, Utensils, HelpCircle, ChefHat } from "lucide-react";
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

const DIGIT_RANGES = [
  { value: "1000", label: "1000 Range" },
  { value: "2000", label: "2000 Range" },
  { value: "3000", label: "3000 Range" },
  { value: "4000", label: "4000 Range" },
  { value: "5000", label: "5000 Range" },
];

export default function CreatePage() {
  const { toast } = useToast();
  const [type, setType] = useState("standard");
  const [digitNumber, setDigitNumber] = useState("1000");
  const [label, setLabel] = useState("vegetable");
  const [masterName, setMasterName] = useState("");
  const [ko, setKo] = useState("");
  const [en, setEn] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/food", {
        type,
        digitNumber: Number(digitNumber),
        label,
        masterName,
        ko,
        en,
      });
    },
    onSuccess: () => {
      toast({ title: "Created", description: `"${masterName}" has been created successfully.` });
      setMasterName("");
      setKo("");
      setEn("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = masterName.trim().length > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Create Food Item</h1>
        <p className="text-sm text-muted-foreground mt-1">Register a new food item in the database</p>
      </div>

      <Tabs value={type} onValueChange={setType}>
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
              <CardTitle className="text-lg">Standard Food</CardTitle>
              <CardDescription>Register a standard food ingredient with a digit range and label</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="digit-number">Digit Range</Label>
                  <Select value={digitNumber} onValueChange={setDigitNumber}>
                    <SelectTrigger data-testid="select-digit-number">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIGIT_RANGES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. vegetable"
                    data-testid="input-label"
                  />
                </div>
              </div>
              <CommonFields
                masterName={masterName}
                setMasterName={setMasterName}
                ko={ko}
                setKo={setKo}
                en={en}
                setEn={setEn}
              />
              <Button
                className="w-full"
                onClick={() => mutation.mutate()}
                disabled={!canSubmit || mutation.isPending}
                data-testid="button-create"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Standard Food
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mystery">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mystery Food</CardTitle>
              <CardDescription>Register a mystery food item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommonFields
                masterName={masterName}
                setMasterName={setMasterName}
                ko={ko}
                setKo={setKo}
                en={en}
                setEn={setEn}
              />
              <Button
                className="w-full"
                onClick={() => mutation.mutate()}
                disabled={!canSubmit || mutation.isPending}
                data-testid="button-create"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Mystery Food
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cuisine">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cuisine Food</CardTitle>
              <CardDescription>Register a cuisine food item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommonFields
                masterName={masterName}
                setMasterName={setMasterName}
                ko={ko}
                setKo={setKo}
                en={en}
                setEn={setEn}
              />
              <Button
                className="w-full"
                onClick={() => mutation.mutate()}
                disabled={!canSubmit || mutation.isPending}
                data-testid="button-create"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Cuisine Food
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommonFields({
  masterName,
  setMasterName,
  ko,
  setKo,
  en,
  setEn,
}: {
  masterName: string;
  setMasterName: (v: string) => void;
  ko: string;
  setKo: (v: string) => void;
  en: string;
  setEn: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="master-name">Master Name</Label>
        <Input
          id="master-name"
          value={masterName}
          onChange={(e) => setMasterName(e.target.value)}
          placeholder="e.g. Onion"
          data-testid="input-master-name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ko">Korean Name</Label>
          <Input
            id="ko"
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            placeholder="e.g. 양파"
            data-testid="input-ko"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="en">English Name</Label>
          <Input
            id="en"
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="e.g. Onion"
            data-testid="input-en"
          />
        </div>
      </div>
    </>
  );
}
