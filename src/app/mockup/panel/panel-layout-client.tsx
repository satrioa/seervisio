"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { StoreShiftOpenModal } from "@/components/store-shift/StoreShiftOpenModal";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { Moon, Sun } from "lucide-react";
import { BrandThemeProvider } from "@/components/theme/brand-theme-provider";
import { useBrandTheme } from "@/components/theme/brand-theme-provider";
import { RightSidebarProvider } from "@/components/layout/right-sidebar-context";
import { RightSidebarPanel } from "@/components/layout/right-sidebar-panel";
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

import { useAutoClose } from "@/hooks/use-auto-close";
import { LanguageProviderWrapper } from "@/components/settings/language-provider-wrapper";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/onboarding-provider";
import { LicenseGuard } from "@/components/layout/license-guard";
import { TourProvider, useTour } from "@/features/tour/TourContext";

const SeervisDynamicIsland = dynamic(
  () => import("@/components/layout/seervis-dynamic-island").then((m) => ({ default: m.SeervisDynamicIsland })),
  { ssr: false }
);

const CommandMenu = dynamic(
  () => import("@/components/layout/command-menu").then((m) => ({ default: m.CommandMenu })),
  { ssr: false }
);

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
  aiCommandCenterEnabled?: boolean;
  baseHref?: string;
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
  aiCommandCenterEnabled,
  baseHref,
}: PanelLayoutClientProps) {
  return (
    <BrandThemeProvider brandSlug={brandSlug}>
      <RightSidebarProvider>
            <ActiveBranchProvider brandSlug={brandSlug} branches={branches} initialBranchId={initialBranchId} userRole={role}>
            <PosCartProvider>
          <OnboardingProvider brandSlug={brandSlug} role={role} onboardingCompleted={onboardingCompleted ?? false}>
            <TourProvider profileId={profileId}>
            <PanelLayoutShell brandSlug={brandSlug} brandId={brandId} brandName={brandName} brandLogoUrl={brandLogoUrl} branches={branches} initialBranchId={initialBranchId} role={role} canAccessAllBranches={canAccessAllBranches} authUserId={authUserId} activeOperatorId={activeOperatorId} activeOperatorName={activeOperatorName} userName={userName} userEmail={userEmail} userAvatarUrl={userAvatarUrl} isImpersonating={isImpersonating} profileId={profileId} onboardingCompleted={onboardingCompleted} onboardingCompletedTasks={onboardingCompletedTasks} activeLicense={activeLicense} baseHref={baseHref}>{children}</PanelLayoutShell>
            </TourProvider>
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
  aiCommandCenterEnabled,
  baseHref,
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

  // Auto-start guided tour if onboarding is not yet complete.
  // Reads persisted progress from tour_progress — no query param needed.
  // Uses a ref so it only fires once per mount (tourCtx object identity
  // changes every render, which would otherwise re-trigger and flicker).
  const tourCtx = useTour();
  const tourStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (onboardingCompleted || tourStartedRef.current) return;
    tourStartedRef.current = true;
    let cancelled = false;
    (async () => {
      const { getTourProgressAction } = await import("@/server/actions/tour-progress.actions");
      const res = await getTourProgressAction("dashboard-v1");
      if (cancelled) return;
      if (res.success) {
        const progress = res.data;
        const shouldStart = !progress || (!progress.completed && !progress.skipped);
        if (shouldStart) {
          tourCtx.startTour("dashboard-v1", progress?.current_step ?? 0);
        }
      } else {
        // No progress record yet — start fresh.
        tourCtx.startTour("dashboard-v1", 0);
      }
    })();
    return () => { cancelled = true; };
  }, [onboardingCompleted]);

  // Resume the guided tour after a route change (e.g. dashboard → branches).
  // The Driver instance is torn down on navigation but the tour + step
  // index are preserved in the TourManager singleton.
  const prevPath = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (prevPath.current && prevPath.current !== pathname) {
      if (tourCtx.status === "touring") {
        tourCtx.resumeCurrent();
      }
    }
    prevPath.current = pathname;
  }, [pathname, tourCtx.status, tourCtx]);

  // Drive cross-page tour navigation via SPA routing (keeps the tour
  // singleton alive so it can resume on the destination page).
  const router = useRouter();
  React.useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent<string>).detail;
      if (path) router.push(path);
    };
    window.addEventListener("seervis:tour-navigate", handler as EventListener);
    return () => window.removeEventListener("seervis:tour-navigate", handler as EventListener);
  }, [router]);

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

  const { mode: theme, toggleTheme: brandToggleTheme } = useBrandTheme();
  const { toggleTheme } = useThemeTransition({ onToggle: brandToggleTheme });

  return (
    <>
    <StoreShiftProvider>
    <OperationalProvider operatorName={activeOperatorName}>
    <LanguageProviderWrapper brandSlug={brandSlug}>
      {isImpersonating && (
        <ImpersonationBanner brandSlug={brandSlug} brandName={brandName} />
      )}
      <div className={`flex max-w-full overflow-hidden bg-sidebar text-sidebar-foreground ${isImpersonating ? "h-[calc(100dvh-40px)]" : "h-dvh"}`}>
          <SidebarProvider
            style={{ "--sidebar-width": "calc(var(--spacing) * 68)" } as React.CSSProperties}
          >
          <AppSidebar brandSlug={brandSlug} brandName={brandName} brandLogoUrl={brandLogoUrl} role={role} canAccessAllBranches={canAccessAllBranches} authUserId={authUserId} activeOperatorId={activeOperatorId} activeOperatorName={activeOperatorName} userName={userName} userEmail={userEmail} userAvatarUrl={userAvatarUrl} aiCommandCenterEnabled={aiCommandCenterEnabled ?? false} baseHref={baseHref} />

          <SidebarInset className={cn(
            "h-dvh min-w-0 max-w-full overflow-x-clip",
            "[html[data-content-layout=centered]_&>*]:mx-auto",
            "[html[data-content-layout=centered]_&>*]:w-full",
            "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
            "peer-data-[variant=inset]:border",
            "[--dashboard-header-height:--spacing(12)]",
          )}>
            {/* ── Header ── */}
            <header className={cn(
              "relative flex h-12 shrink-0 items-center gap-2 overflow-hidden border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
              "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
            )}>
              <div className="flex w-full min-w-0 items-center justify-between px-2 sm:px-4 lg:px-6">
                <div className="flex min-w-0 items-center gap-1 lg:gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mx-2 hidden data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center sm:block" />
                  <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {pageTitle}
                  </h1>
                </div>

                {/* Dynamic Island — centered */}
                <motion.div
                  className="pointer-events-none fixed left-1/2 top-3 z-[60] hidden md:block"
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

                <div className="flex min-w-0 items-center gap-1 lg:gap-2">
                  <CommandMenu brandSlug={brandSlug} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden size-8 shrink-0 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground sm:inline-flex"
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
                  <div className="shrink-0 max-[420px]:hidden">
                    <NotificationPopover brandSlug={brandSlug} brandId={brandId} />
                  </div>
                </div>
              </div>
            </header>

            {/* ── Mobile Dynamic Island row ── */}
            <div className="pointer-events-none fixed left-1/2 top-3 z-[60] -translate-x-1/2 md:hidden">
              <div className="pointer-events-auto">
                <SeervisDynamicIsland userName={userName} onOpenShift={handleOpenShift} activeLicense={activeLicense} />
              </div>
            </div>

            {/* Page content */}
            <main
              ref={mainScrollRef}
              className={`relative z-0 h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? "" : "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"} ${isPosV4Page ? "p-0" : isInventoryV4Page ? "rounded-[14px] bg-sidebar p-1" : "p-3 sm:p-4 md:p-6"} ${isMobile ? "pb-14" : ""}`}
            >
              <LicenseGuard
                brandSlug={brandSlug}
                licenseStatus={activeLicense?.status ?? null}
                expiresAt={activeLicense?.expires_at ?? null}
              >
                {children}
              </LicenseGuard>
            </main>
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
