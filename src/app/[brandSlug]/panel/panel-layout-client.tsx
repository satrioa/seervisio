"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SeervisDynamicIsland } from "@/components/layout/seervis-dynamic-island";
import { StoreShiftOpenModal } from "@/components/store-shift/StoreShiftOpenModal";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { Moon, Sun } from "lucide-react";
import { BrandThemeProvider } from "@/components/theme/brand-theme-provider";
import { useBrandTheme } from "@/components/theme/brand-theme-provider";
import { RightSidebarProvider } from "@/components/layout/right-sidebar-context";
import { RightSidebarPanel } from "@/components/layout/right-sidebar-panel";
import GradualBlur from "@/components/GradualBlur";
import { ActiveBranchProvider, useActiveBranch, type ActiveBranchOption } from "@/components/layout/active-branch-context";
import { PosCartProvider } from "@/components/pos/pos-cart-context";
import { PosCartSidebar } from "@/components/pos/pos-cart-sidebar";
import { OperationalProvider } from "@/features/operational/operational-provider";
import { StoreShiftProvider } from "@/features/store-shift/store-shift-provider";
import { saveRememberedAccount, loadRememberedAccounts } from "@/lib/auth/remembered-accounts";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useThemeTransition } from "@/hooks/use-theme-transition";
import { SystemLoader } from "@/components/system-loader/SystemLoader";
import { useBootLoader, type BootTask } from "@/components/system-loader/BootProvider";
import { createClient } from "@/lib/supabase/client";
import { useAutoClose } from "@/hooks/use-auto-close";
import { LanguageProviderWrapper } from "@/components/settings/language-provider-wrapper";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/onboarding-provider";
import { LicenseGuard } from "@/components/layout/license-guard";

interface PanelLayoutClientProps {
  children: React.ReactNode;
  brandSlug: string;
  brandId: number;
  brandName: string;
  brandLogoUrl: string | null;
  branches: ActiveBranchOption[];
  initialBranchId: string | null;
  role: string;
  canAccessAllBranches: boolean;
  authUserId: string;
  activeOperatorId: string | null;
  activeOperatorName: string | null;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
  isImpersonating?: boolean;
  profileId: string;
  onboardingCompleted?: boolean;
  onboardingCompletedTasks?: string[];
  activeLicense: { status: string; expires_at: string | null; is_trial: boolean } | null;
}

const PAGE_TITLES: Record<string, string> = {
  accounts: "Account",
  branches: "Cabang",
  customers: "Customers",
  dashboard: "Dashboard",
  finance: "Finance",
  inventory: "Inventory",
  pos: "POS",
  services: "Services",
  settings: "Settings",
  "audit-log": "Audit Log",
  "payment-accounts": "Payment Account",
  "payment-methods": "Payment Method",
  "stock-reports": "Laporan Stok",
  "store-shifts": "Store Shift",
  "technician-performance": "Performa Teknisi",
};

function getPageTitle(pathname: string | null) {
  const segment = pathname?.split("/panel/")[1]?.split("/")[0] ?? "dashboard";
  return PAGE_TITLES[segment] ?? segment.replace(/-/g, " ");
}

export function PanelLayoutClient({
  children,
  brandSlug,
  brandId,
  brandName,
  brandLogoUrl,
  branches,
  initialBranchId,
  role,
  canAccessAllBranches,
  authUserId,
  activeOperatorId,
  activeOperatorName,
  userName,
  userEmail,
  userAvatarUrl,
  isImpersonating = false,
  profileId,
  onboardingCompleted,
  onboardingCompletedTasks,
  activeLicense,
}: PanelLayoutClientProps) {
  return (
    <BrandThemeProvider brandSlug={brandSlug}>
      <RightSidebarProvider>
            <ActiveBranchProvider brandSlug={brandSlug} branches={branches} initialBranchId={initialBranchId} userRole={role}>
            <PosCartProvider>
          <OnboardingProvider brandSlug={brandSlug} role={role} onboardingCompleted={onboardingCompleted ?? false}>
            <PanelLayoutShell brandSlug={brandSlug} brandId={brandId} brandName={brandName} brandLogoUrl={brandLogoUrl} branches={branches} initialBranchId={initialBranchId} role={role} canAccessAllBranches={canAccessAllBranches} authUserId={authUserId} activeOperatorId={activeOperatorId} activeOperatorName={activeOperatorName} userName={userName} userEmail={userEmail} userAvatarUrl={userAvatarUrl} isImpersonating={isImpersonating} profileId={profileId} onboardingCompleted={onboardingCompleted} onboardingCompletedTasks={onboardingCompletedTasks} activeLicense={activeLicense}>{children}</PanelLayoutShell>
          </OnboardingProvider>
          </PosCartProvider>
        </ActiveBranchProvider>
      </RightSidebarProvider>
    </BrandThemeProvider>
  );
}

function PanelLayoutShell({
  children,
  brandSlug,
  brandId,
  brandName,
  brandLogoUrl,
  role,
  canAccessAllBranches,
  authUserId,
  activeOperatorId,
  activeOperatorName,
  userName,
  userEmail,
  userAvatarUrl,
  isImpersonating,
  profileId,
  onboardingCompleted,
  onboardingCompletedTasks,
  activeLicense,
}: PanelLayoutClientProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const isPosPage = pathname?.includes("/panel/pos");
  const isPosV4Page = pathname?.includes("/panel/pos-v4");
  const isInventoryV4Page = pathname?.includes("/panel/inventory-v4");
  const isPaymentAccountsPage = pathname?.includes("/panel/payment-accounts");
  const isFinanceTransactionsPage = pathname?.includes("/panel/finance/transactions");
  const hasFlushRightEdge = isPosPage || isPaymentAccountsPage || isFinanceTransactionsPage;
  const [isIslandDetached, setIsIslandDetached] = React.useState(false);
  const [showMainBottomBlur, setShowMainBottomBlur] = React.useState(false);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);
  const { activeBranchId, branches, activeBranchName } = useActiveBranch();
  const [openShiftModal, setOpenShiftModal] = React.useState(false);
  const isMobile = useIsMobile();

  useAutoClose();

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;
  const resolvedBranchName = resolvedBranchId
    ? branches.find((b) => b.id === resolvedBranchId)?.name ?? activeBranchName ?? undefined
    : undefined;

  React.useEffect(() => {
    const handler = () => setOpenShiftModal(true);
    window.addEventListener("seervis:open-shift-modal", handler);
    return () => window.removeEventListener("seervis:open-shift-modal", handler);
  }, []);

  const handleOpenShift = useCallback(() => {
    setOpenShiftModal(true);
  }, []);

  React.useEffect(() => {
    let animationFrame = 0;
    let delayedCheck = 0;

    const updateMainScrollState = () => {
      const scrollContainer = mainScrollRef.current;
      const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;

      setIsIslandDetached(scrollTop > 48);

      if (!scrollContainer) {
        setShowMainBottomBlur(false);
        return;
      }

      const hasScrollableContent =
        scrollContainer.scrollHeight > scrollContainer.clientHeight + 1;
      const isAtBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - 2;

      setShowMainBottomBlur(hasScrollableContent && !isAtBottom);
    };

    const scheduleMainScrollStateUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateMainScrollState);
    };

    updateMainScrollState();
    scheduleMainScrollStateUpdate();
    delayedCheck = window.setTimeout(updateMainScrollState, 250);

    const scrollContainer = mainScrollRef.current;

    scrollContainer?.addEventListener("scroll", scheduleMainScrollStateUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleMainScrollStateUpdate);
    window.addEventListener("scroll", scheduleMainScrollStateUpdate, {
      passive: true,
    });

    const resizeObserver =
      scrollContainer && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMainScrollStateUpdate)
        : null;
    if (scrollContainer && resizeObserver) {
      resizeObserver.observe(scrollContainer);
    }

    const mutationObserver =
      scrollContainer && typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleMainScrollStateUpdate)
        : null;
    if (scrollContainer && mutationObserver) {
      mutationObserver.observe(scrollContainer, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(delayedCheck);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      scrollContainer?.removeEventListener(
        "scroll",
        scheduleMainScrollStateUpdate
      );
      window.removeEventListener("resize", scheduleMainScrollStateUpdate);
      window.removeEventListener("scroll", scheduleMainScrollStateUpdate);
    };
  }, []);

  // Save current account to remembered accounts on mount
  React.useEffect(() => {
    if (!userEmail) return;
    const accounts = loadRememberedAccounts();
    const existing = accounts.find((a) => a.email === userEmail && a.brandSlug === brandSlug);
    if (!existing) {
      saveRememberedAccount({
        profileId: activeOperatorId ?? "",
        authUserId,
        name: userName ?? "",
        email: userEmail,
        role,
        roleLabel: ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role,
        brandSlug,
        lastUsedAt: new Date().toISOString(),
      });
    }
  }, []);

  /* ── Boot loader ── */
  const boot = useBootLoader();
  const bootStarted = useRef(false);
  const { setBrandColor } = boot;

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const supabase = createClient();
    const tasks: BootTask[] = [
      {
        id: "session",
        label: "Validate Session",
        action: async () => {
          const s = Date.now();
          await supabase.auth.getSession();
          const e = Date.now() - s;
          if (e < 300) await wait(300 - e);
        },
      },
      {
        id: "profile",
        label: "Load User",
        action: async () => {
          await wait(350);
        },
      },
      {
        id: "branch",
        label: "Set Branch",
        action: async () => {
          await wait(300);
        },
      },
      {
        id: "permissions",
        label: "Load Permissions",
        action: async () => {
          await wait(300);
        },
      },
      {
        id: "theme",
        label: "Apply Theme",
        action: async () => {
          const s = Date.now();
          try {
            const { getBrandThemeAction } = await import(
              "@/server/actions/brand-theme.actions"
            );
            const result = await getBrandThemeAction(brandSlug);
            if (result.success) {
              setBrandColor(result.data.primaryColor);
            }
          } catch {
            // Non-critical
          }
          const e = Date.now() - s;
          if (e < 400) await wait(400 - e);
        },
      },
      {
        id: "shift",
        label: "Check Shift",
        action: async () => {
          await wait(350);
        },
      },
      {
        id: "payments",
        label: "Load Payment Methods",
        action: async () => {
          await wait(320);
        },
      },
      {
        id: "cache",
        label: "Warm Cache",
        action: async () => {
          await wait(300);
        },
      },
      {
        id: "dashboard",
        label: "Load Dashboard",
        action: async () => {
          await wait(350);
        },
      },
      {
        id: "sidebar",
        label: "Build Navigation",
        action: async () => {
          await wait(280);
        },
      },
      {
        id: "features",
        label: "Load Feature Flags",
        action: async () => {
          await wait(250);
        },
      },
      {
        id: "ready",
        label: "Prepare Workspace",
        action: async () => {
          await wait(200);
        },
      },
    ];

    boot.start(tasks);
  }, [brandSlug, boot, setBrandColor]);

  const { mode: theme, toggleTheme: brandToggleTheme } = useBrandTheme();
  const { toggleTheme } = useThemeTransition({ onToggle: brandToggleTheme });

  return (
    <>
    <SystemLoader />
    <StoreShiftProvider>
    <OperationalProvider operatorName={activeOperatorName}>
    <LanguageProviderWrapper brandSlug={brandSlug}>
      {isImpersonating && (
        <ImpersonationBanner brandSlug={brandSlug} brandName={brandName} />
      )}
      <div className={`flex overflow-hidden bg-sidebar text-sidebar-foreground ${isImpersonating ? "h-[calc(100dvh-40px)]" : "h-dvh"}`}>
        <SidebarProvider>
          <AppSidebar brandSlug={brandSlug} brandName={brandName} brandLogoUrl={brandLogoUrl} role={role} canAccessAllBranches={canAccessAllBranches} authUserId={authUserId} activeOperatorId={activeOperatorId} activeOperatorName={activeOperatorName} userName={userName} userEmail={userEmail} userAvatarUrl={userAvatarUrl} />

          <SidebarInset className={`h-dvh min-w-0 overflow-hidden border-none !bg-sidebar text-sidebar-foreground shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none md:shadow-none md:peer-data-[variant=inset]:!m-0 md:peer-data-[variant=inset]:!rounded-none md:peer-data-[variant=inset]:!shadow-none ${hasFlushRightEdge ? "pr-0" : "pr-2"}`}>
            {/* ── Desktop header ── */}
            <header className="relative z-40 flex h-14 items-center overflow-visible !bg-sidebar px-3 text-sidebar-foreground md:h-16 md:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
              </div>

              {/* Dynamic Island — desktop only, sticky viewport top anchor */}
              <motion.div
                className="pointer-events-none absolute left-1/2 top-3 z-50 hidden md:block"
                initial={false}
                animate={{
                  x: "-50%",
                  scale: isIslandDetached ? 0.95 : 1,
                  y: isIslandDetached ? -1 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 360,
                  damping: 32,
                  mass: 0.7,
                }}
              >
                <div className="pointer-events-auto">
                  <SeervisDynamicIsland userName={userName} onOpenShift={handleOpenShift} activeLicense={activeLicense} />
                </div>
              </motion.div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  onClick={toggleTheme}
                  aria-label={
                    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
                  }
                >
                  {theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                </Button>
                <NotificationPopover brandSlug={brandSlug} brandId={brandId} />
              </div>
            </header>

            {/* ── Mobile Dynamic Island row ── */}
            <div className="relative z-50 flex justify-center px-3 pb-2 pt-0 md:hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.92)_58%,hsl(var(--background)/0)_100%)]">
              <SeervisDynamicIsland userName={userName} onOpenShift={handleOpenShift} activeLicense={activeLicense} />
            </div>

            {/* Page content */}
            <div className={`relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden outline-none ring-0 md:mx-3 md:mb-3 ${isInventoryV4Page ? "rounded-[14px] border-none bg-sidebar shadow-none" : isPosV4Page ? "bg-transparent border-none shadow-none" : `border border-border/60 bg-card shadow-sm ${isPaymentAccountsPage ? "rounded-xl" : "rounded-2xl"}`}`}>
              <main
                ref={mainScrollRef}
                className={`relative z-0 h-full min-h-0 overflow-y-auto overflow-x-hidden ${isMobile ? "" : "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"} ${isPosV4Page ? "p-0 [&>*]:space-y-0" : isInventoryV4Page ? "rounded-[14px] bg-sidebar p-1 [&>*]:space-y-3" : "p-3 sm:p-4 md:p-6 [&>*]:space-y-3"} ${isMobile ? "pb-14" : ""}`}
              >
                <LicenseGuard
                  brandSlug={brandSlug}
                  licenseStatus={activeLicense?.status ?? null}
                  expiresAt={activeLicense?.expires_at ?? null}
                >
                  {children}
                </LicenseGuard>
              </main>
            <GradualBlur
              target="parent"
              position="bottom"
              height="3.5rem"
              strength={2}
              divCount={5}
              curve="bezier"
              exponential
              opacity={1}
              zIndex={10}
              animated
              duration="0.42s"
              easing="cubic-bezier(0.22, 1, 0.36, 1)"
              style={{
                background:
                  "linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card) / 0.82) 42%, transparent 100%)",
                opacity: showMainBottomBlur ? 1 : 0,
                transform: showMainBottomBlur ? "translateY(0)" : "translateY(10px)",
                transition:
                  "opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1), transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "opacity, transform",
              }}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
          {pathname?.includes("/panel/services") && <RightSidebarPanel />}
          {pathname?.includes("/panel/pos") && <PosCartSidebar />}
          <MobileNav brandSlug={brandSlug} />

      {resolvedBranchId && (
        <StoreShiftOpenModal
          open={openShiftModal}
          onOpenChange={setOpenShiftModal}
          brandSlug={brandSlug}
          branchId={resolvedBranchId}
          branchName={resolvedBranchName}
        />
      )}
    </div>
    </LanguageProviderWrapper>
    </OperationalProvider>
    </StoreShiftProvider>
    </>
  );
}
