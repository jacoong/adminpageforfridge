import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ApiConfigHeader } from "@/components/api-config-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { useApiConfig } from "@/lib/api-config";
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

function App() {
  const syncToServer = useApiConfig((s) => s.syncToServer);

  useEffect(() => {
    syncToServer();
  }, [syncToServer]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-1">
                  <ApiConfigHeader />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-y-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
