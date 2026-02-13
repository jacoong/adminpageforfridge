import { useState, useEffect } from "react";
import { Settings, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useApiConfig } from "@/lib/api-config";

export function ApiConfigHeader() {
  const { baseUrl, setBaseUrl } = useApiConfig();
  const [inputUrl, setInputUrl] = useState(baseUrl);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInputUrl(baseUrl);
  }, [baseUrl]);

  const handleSave = () => {
    const trimmed = inputUrl.endsWith("/") ? inputUrl.slice(0, -1) : inputUrl;
    setBaseUrl(trimmed);
    setOpen(false);
  };

  const isConfigured = baseUrl.length > 0;

  return (
    <div className="flex items-center gap-2">
      {isConfigured ? (
        <Badge variant="outline" className="text-xs gap-1" data-testid="badge-api-status">
          <Check className="w-3 h-3 text-chart-2" />
          API Connected
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs gap-1" data-testid="badge-api-status">
          <AlertCircle className="w-3 h-3 text-destructive" />
          Not Configured
        </Badge>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" data-testid="button-api-settings">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Configuration</DialogTitle>
            <DialogDescription>
              Enter your FastAPI Lambda base URL to connect the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Base URL</label>
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://xxxxx.amazonaws.com/stage"
              data-testid="input-api-url"
            />
            <p className="text-xs text-muted-foreground">
              Do not include a trailing slash. The endpoint paths will be appended automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-config">
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
