import { useLocation, Link } from "wouter";
import { Search, Plus, ArrowRightLeft, Database } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { key: "search", title: "Search", path: "/", icon: Search, description: "Find ingredients" },
  { key: "management", title: "Create/Delete", path: "/create", icon: Plus, description: "Manage payloads" },
  { key: "migration", title: "Migration", path: "/migration", icon: ArrowRightLeft, description: "Merge items" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
            <Database className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Master Food</h2>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.key}`}
                    >
                      <Link href={item.path}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">v1.0</Badge>
          <span className="text-xs text-muted-foreground">Food Admin</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
