"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface PanelLayoutClientProps {
  children: React.ReactNode;
  brandSlug: string;
  userName: string;
  userEmail: string;
  role: string;
  roleLabel: string;
  brandName: string;
  branches: Array<{ id: string; name: string }>;
  currentBranchId: string | null;
}

export function PanelLayoutClient({
  children,
  brandSlug,
  userName,
  userEmail,
  role,
  roleLabel,
  brandName,
  branches,
  currentBranchId,
}: PanelLayoutClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBranchSwitch = useCallback(
    async (branchId: string) => {
      // Store the selected branch in localStorage
      localStorage.setItem(`preferred_branch_${brandSlug}`, branchId);
      router.refresh();
    },
    [brandSlug, router]
  );

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 -translate-x-full transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : ""
        }`}
      >
        <AppSidebar brandSlug={brandSlug} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Brand name */}
            <div className="hidden sm:block">
              <span className="text-sm font-medium">{brandName}</span>
            </div>

            {/* Branch switcher */}
            {branches.length > 1 && (
              <div className="hidden sm:block">
                <BranchSwitcher
                  branches={branches}
                  currentBranchId={currentBranchId}
                  onSwitch={handleBranchSwitch}
                />
              </div>
            )}
          </div>

          <UserMenu
            userName={userName}
            userEmail={userEmail}
            role={roleLabel}
            onLogout={handleLogout}
          />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
