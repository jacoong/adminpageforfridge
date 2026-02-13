import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ApiConfigHeader } from "@/components/api-config-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import LoginPage from "@/pages/login-page";
import SearchPage from "@/pages/search-page";
import CreatePage from "@/pages/create-page";
import MigrationPage from "@/pages/migration-page";
import NotFound from "@/pages/not-found";
import { isAuthenticated, logout } from "@/lib/auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SearchPage} />
      <Route path="/create" component={CreatePage} />
      <Route path="/browse" component={SearchPage} />
      <Route path="/migration" component={MigrationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const handleLogout = () => {
    logout();
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
  const [authState, setAuthState] = useState<"authenticated" | "unauthenticated">(
    isAuthenticated() ? "authenticated" : "unauthenticated",
  );

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
