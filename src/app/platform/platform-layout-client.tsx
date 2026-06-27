"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { NotificationCenter } from "@/components/layout/notification-center";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformLayoutClientProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}

function getPageTitle(pathname: string | null): string {
  const segment = pathname?.split("/platform/")[1]?.split("/")[0] ?? "dashboard";
  const titles: Record<string, string> = {
    dashboard: "Platform Dashboard",
    tenants: "Tenants",
    subscriptions: "Subscriptions",
    packages: "Packages",
    usage: "Usage",
    revenue: "Revenue",
    "system-health": "System Health",
    monitoring: "Monitoring",
    "audit-logs": "Audit Logs",
    "system-logs": "System Logs",
    settings: "Platform Settings",
  };
  return titles[segment] ?? segment.replace(/-/g, " ");
}

export function PlatformLayoutClient({
  children,
  userName,
  userEmail,
}: PlatformLayoutClientProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-sidebar text-sidebar-foreground">
      <SidebarProvider>
        <PlatformSidebar userName={userName} userEmail={userEmail} />

        <SidebarInset className="h-screen min-w-0 overflow-hidden border-none !bg-sidebar text-sidebar-foreground shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none md:shadow-none md:peer-data-[variant=inset]:!m-0 md:peer-data-[variant=inset]:!rounded-none md:peer-data-[variant=inset]:!shadow-none">
          {/* Header */}
          <header className="relative z-40 flex h-14 items-center overflow-visible !bg-sidebar px-3 text-sidebar-foreground md:h-16 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {pageTitle}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
              <NotificationCenter />
            </div>
          </header>

          {/* Content */}
          <div className="relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden outline-none ring-0 md:mx-3 md:mb-3">
            <main className="relative z-0 h-full min-h-0 overflow-y-auto overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-3 sm:p-4 md:p-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
