"use client";

import * as React from "react";
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
import { Bell, Moon, Sun } from "lucide-react";
import { BrandThemeProvider } from "@/components/theme/brand-theme-provider";
import { useBrandTheme } from "@/components/theme/brand-theme-provider";
import { RightSidebarProvider } from "@/components/layout/right-sidebar-context";
import { RightSidebarPanel } from "@/components/layout/right-sidebar-panel";
import GradualBlur from "@/components/GradualBlur";
import { ActiveBranchProvider, type ActiveBranchOption } from "@/components/layout/active-branch-context";
import { PosCartProvider } from "@/components/pos/pos-cart-context";
import { PosCartSidebar } from "@/components/pos/pos-cart-sidebar";

interface PanelLayoutClientProps {
  children: React.ReactNode;
  brandSlug: string;
  branches: ActiveBranchOption[];
  initialBranchId: string | null;
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
  branches,
  initialBranchId,
}: PanelLayoutClientProps) {
  return (
    <BrandThemeProvider brandSlug={brandSlug}>
      <RightSidebarProvider>
        <ActiveBranchProvider brandSlug={brandSlug} branches={branches} initialBranchId={initialBranchId}>
          <PosCartProvider>
            <PanelLayoutShell brandSlug={brandSlug} branches={branches} initialBranchId={initialBranchId}>{children}</PanelLayoutShell>
          </PosCartProvider>
        </ActiveBranchProvider>
      </RightSidebarProvider>
    </BrandThemeProvider>
  );
}

function PanelLayoutShell({
  children,
  brandSlug,
}: PanelLayoutClientProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [isIslandDetached, setIsIslandDetached] = React.useState(false);
  const [showMainBottomBlur, setShowMainBottomBlur] = React.useState(false);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

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

  const { mode: theme, toggleTheme } = useBrandTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarProvider>
        <AppSidebar brandSlug={brandSlug} />

        <SidebarInset className="h-screen min-w-0 overflow-hidden border-none pr-2 shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none md:shadow-none md:peer-data-[variant=inset]:!m-0 md:peer-data-[variant=inset]:!rounded-none md:peer-data-[variant=inset]:!shadow-none">
          {/* ── Desktop header ── */}
          <header className="relative z-40 flex h-16 items-center overflow-visible px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {pageTitle}
              </h1>
            </div>

            {/* Dynamic Island — desktop only, sticky viewport top anchor */}
            <motion.div
              className="pointer-events-none fixed left-1/2 top-3 z-50 hidden md:block"
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
                <SeervisDynamicIsland />
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-red-500" />
              </Button>
            </div>
          </header>

          {/* ── Mobile Dynamic Island row ── */}
          <div className="relative z-50 px-4 pb-3 md:hidden">
            <SeervisDynamicIsland />
          </div>

          {/* Page content */}
          <div className="relative mx-3 mb-3 min-h-0 flex-1 overflow-hidden rounded-2xl shadow-sm outline-none ring-0">
            <main
              ref={mainScrollRef}
              className="relative z-0 h-full overflow-y-auto overflow-x-hidden p-6 [-ms-overflow-style:none] [scrollbar-width:none] [&>*]:space-y-3 [&::-webkit-scrollbar]:hidden"
            >
              {children}
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
    </div>
  );
}
