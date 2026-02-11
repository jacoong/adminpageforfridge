import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ApiConfigHeader } from "@/components/api-config-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { useApiConfig } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import LoginPage from "@/pages/login-page";
import SearchPage from "@/pages/search-page";
import CreatePage from "@/pages/create-page";
import BrowsePage from "@/pages/browse-page";
import NicknamesPage from "@/pages/nicknames-page";
import MigrationPage from "@/pages/migration-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SearchPage} />
      <Route path="/create" component={CreatePage} />
      <Route path="/browse" component={BrowsePage} />
      <Route path="/nicknames" component={NicknamesPage} />
      <Route path="/migration" component={MigrationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const syncToServer = useApiConfig((s) => s.syncToServer);

  useEffect(() => {
    syncToServer();
  }, [syncToServer]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    onLogout();
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <ApiConfigHeader />
              <ThemeToggle />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setAuthState(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        setAuthState("unauthenticated");
      });
  }, []);

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-sm px-4">
          <Skeleton className="h-12 w-12 mx-auto rounded-md" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <LoginPage
        onLogin={() => setAuthState("authenticated")}
      />
    );
  }

  return (
    <AuthenticatedApp
      onLogout={() => {
        queryClient.clear();
        setAuthState("unauthenticated");
      }}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
