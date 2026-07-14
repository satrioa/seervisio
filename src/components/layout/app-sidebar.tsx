"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  Wrench,
  Package,
  Banknote,
  Users,
  Settings,
  ChevronRight,
  ChevronsUpDown,
  Check,
  LogOut,
  Loader2,
  UserPlus,
  UserCog,
  BookOpen,
  Compass,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { hasPermission } from "@/lib/permissions/require-permission";
import { ROLE_LABELS, type Role } from "@/lib/permissions/roles";
import { logoutAction } from "@/server/actions/operator.actions";
import { loadRememberedAccounts, type RememberedAccount } from "@/lib/auth/remembered-accounts";
import { createClient } from "@/lib/supabase/client";
import { updateLastLoginAt } from "@/repositories/profile.repository";
import { useBootLoader, type BootTask } from "@/components/system-loader/BootProvider";
import { ShiftCashWidget } from "@/components/layout/shift-cash-widget";



// Permission key for each nav item
function itemPermission(href: string): string | null {
  if (href === "dashboard") return null; // always visible
  if (href === "services") return "service.view";
  if (href === "customers") return "customer.view";
  if (href === "pos-v4") return "pos.view";
  if (href === "store-shift") return "store_shift.view";
  if (href === "inventory-v4") return "inventory.view";
  if (href === "stock-reports") return "inventory.view";
  if (href === "finance") return "finance.view";
  if (href === "finance/cashflow") return "cashflow.view";
  if (href === "finance/transactions") return "finance_transaction.view";
  if (href === "payment-accounts") return "payment_account.view";
  if (href === "payment-methods") return "payment_method.view";
  if (href === "branches") return "branch.manage";
  if (href === "accounts") return "user.manage";
  if (href === "technician-performance") return "service.view";
  if (href === "audit-log") return "audit_log.view";
  if (href.startsWith("settings")) return "settings.manage";
  return null;
}

function filterItemsByRole(items: { href: string; label: string; adminOnly?: boolean }[], role: Role): { href: string; label: string; adminOnly?: boolean }[] {
  return items.filter((item) => {
    if (item.adminOnly) {
      return role === "MASTER_ADMIN" || role === "PLATFORM_OWNER";
    }
    const perm = itemPermission(item.href);
    if (!perm) return true;
    return hasPermission(role, perm as any);
  });
}

function filterGroupsByRole(groups: typeof COLLAPSIBLE_GROUPS, role: Role) {
  return groups
    .map((group) => ({
      ...group,
      items: filterItemsByRole(group.items, role),
    }))
    .filter((group) => group.items.length > 0);
}

const ACCOUNTS: {
  id: string;
  initials: string;
  name: string;
  role: string;
}[] = [];

const springEase = [0.22, 1, 0.36, 1] as const;
const standardEase = [0.4, 0, 0.2, 1] as const;

const submenuContainerVariants: Variants = {
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.24, ease: springEase },
      opacity: { duration: 0.16, ease: "easeOut" },
      staggerChildren: 0.035,
      delayChildren: 0.03,
    },
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: standardEase },
      opacity: { duration: 0.12, ease: "easeIn" },
      staggerChildren: 0.025,
      staggerDirection: -1,
    },
  },
};

const submenuItemVariants: Variants = {
  open: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.2, ease: springEase },
  },
  closed: {
    x: -6,
    opacity: 0,
    filter: "blur(2px)",
    transition: { duration: 0.14, ease: standardEase },
  },
};

/* ── Nav data ── */
interface SubNavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

interface CollapsibleGroup {
  label: string;
  icon: React.ElementType;
  items: SubNavItem[];
}

const TOUR_ID_MAP: Record<string, string> = {
  services: "services",
  "pos-v4": "pos",
  "store-shift": "store-shift",
  "inventory-v4": "inventory",
  "payment-methods": "payment-methods",
  branches: "branches",
  accounts: "users",
};

const COLLAPSIBLE_GROUPS: CollapsibleGroup[] = [
  {
    label: "Operation",
    icon: Wrench,
    items: [
      { href: "services", label: "Service" },
      { href: "pos-v4", label: "POS" },
      { href: "store-shift", label: "Store Shift" },
    ],
  },
  {
    label: "Stok Manajemen",
    icon: Package,
    items: [
      { href: "inventory-v4", label: "Inventory" },
      { href: "stock-reports", label: "Laporan Stok" },
    ],
  },
  {
    label: "Finance",
    icon: Banknote,
    items: [
      { href: "finance", label: "Laporan Keuangan" },
      { href: "finance/cashflow", label: "Mutasi Kas & Bank" },
      { href: "finance/transactions", label: "Pendapatan & Pengeluaran" },
      { href: "payment-accounts", label: "Akun Pembayaran" },
      { href: "payment-methods", label: "Metode Pembayaran" },
    ],
  },
  {
    label: "Management",
    icon: Users,
    items: [
      { href: "customers", label: "Customers" },
      { href: "licenses", label: "License Center" },
      { href: "branches", label: "Cabang" },
      { href: "accounts", label: "Account" },
      { href: "technician-performance", label: "Performa Teknisi" },
      { href: "audit-log", label: "Audit Log" },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { href: "settings?section=brand-profile", label: "Brand Profile" },
      { href: "settings?section=appearance", label: "Appearance & Brand Theme" },
      { href: "settings?section=language-region", label: "Language & Region" },
      { href: "settings?section=target-goal", label: "Target & Goal" },
      { href: "settings?section=system", label: "System Settings" },
      { href: "settings?section=ai", label: "AI & Insight Engine" },
    ],
  },
];

interface AppSidebarProps {
  brandSlug: string;
  brandName: string;
  brandLogoUrl: string | null;
  role: string;
  canAccessAllBranches: boolean;
  authUserId: string;
  activeOperatorId: string | null;
  activeOperatorName: string | null;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
}

export function AppSidebar({ brandSlug, brandName, brandLogoUrl, role, canAccessAllBranches, authUserId, activeOperatorId, activeOperatorName, userName, userEmail, userAvatarUrl }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );
  const [currentSection, setCurrentSection] = React.useState<string | null>(null);
  const [brandImageFailed, setBrandImageFailed] = React.useState(false);
  const { activeBranchId, activeBranchName, branches, setActiveBranchId, isSwitching, setIsSwitching } = useActiveBranch();
  const { isMobile, setOpenMobile } = useSidebar();
  const boot = useBootLoader();
  const restartTour = React.useCallback(() => {
    (window as any).__onboardingReset?.();
  }, []);

  const handleNavClick = React.useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  const handleBranchSwitch = React.useCallback(async (branchId: string | null) => {
    if (isSwitching) return;
    if (branchId === activeBranchId) return;

    const targetBranch = branches.find(b => b.id === branchId);
    const toName = targetBranch?.name ?? "Semua Cabang";

    setIsSwitching(true);

    try {
      const tasks: BootTask[] = [
      {
        id: "switch",
        label: "Switch Branch",
        action: async () => {
          setActiveBranchId(branchId);
          await new Promise((r) => setTimeout(r, 400));
        },
      },
      {
        id: "workspace",
        label: "Load Workspace",
        action: async () => {
          await new Promise((r) => setTimeout(r, 350));
        },
      },
      {
        id: "cache",
        label: "Warm Cache",
        action: async () => {
          await new Promise((r) => setTimeout(r, 250));
        },
      },
      ];

      await boot.start(tasks);
      router.refresh();
    } catch {
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, activeBranchId, branches, setIsSwitching, setActiveBranchId, router, boot]);

  const visibleGroups = React.useMemo(
    () => filterGroupsByRole(COLLAPSIBLE_GROUPS, role as Role),
    [role],
  );

  React.useEffect(() => {
    if (pathname?.includes("/panel/settings")) {
      const params = new URLSearchParams(window.location.search);
      setCurrentSection(params.get("section"));
    } else {
      setCurrentSection(null);
    }
  }, [pathname]);

  function isActive(href: string) {
    const panelPath = `/${brandSlug}/panel/${href}`;
    const hasMoreSpecificItem = COLLAPSIBLE_GROUPS.some((group) =>
      group.items.some((item) => item.href.startsWith(`${href}/`)),
    );

    if (href.includes("?section=")) {
      const [pathPart, queryPart] = href.split("?");
      const targetParams = new URLSearchParams(queryPart);
      const targetSection = targetParams.get("section");
      const settingsPath = `/${brandSlug}/panel/${pathPart}`;
      return pathname === settingsPath && currentSection === targetSection;
    }

    if (href.includes("/")) return pathname === panelPath;
    if (hasMoreSpecificItem) return pathname === panelPath;
    return pathname === panelPath || pathname?.startsWith(`${panelPath}/`);
  }

  React.useEffect(() => {
    const activeGroup = visibleGroups.find((group) =>
      group.items.some((item) => isActive(item.href))
    );

    if (!activeGroup) return;

    setOpenGroups((prev) => {
      if (prev[activeGroup.label]) return prev;
      return { ...prev, [activeGroup.label]: true };
    });
  }, [pathname, currentSection, visibleGroups]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* ── Brand / Branch Switcher ── */}
      <SidebarHeader >
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  data-tour="brand-overview"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {brandLogoUrl && !brandImageFailed ? (
                    <img
                      src={brandLogoUrl}
                      alt={brandName}
                      className="aspect-square size-8 rounded-lg object-cover"
                      onError={() => setBrandImageFailed(true)}
                    />
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <span className="text-sm font-bold">{getInitials(brandName)}</span>
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{brandName}</span>
                    {activeBranchName && (
                      <span className="truncate text-xs text-muted-foreground">{activeBranchName}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                {/* General (all branches) — only for all-branch roles */}
                {canAccessAllBranches && (
                  <>
                    <DropdownMenuItem
                      className="gap-2.5 p-3"
                      disabled={isSwitching}
                      onClick={() => handleBranchSwitch(null)}
                    >
                      {brandLogoUrl && !brandImageFailed ? (
                        <img
                          src={brandLogoUrl}
                          alt={brandName}
                          className="size-7 shrink-0 rounded-md object-cover"
                          onError={() => setBrandImageFailed(true)}
                        />
                      ) : (
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                          {getInitials(brandName)}
                        </div>
                      )}
                      <div className="grid flex-1 gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{brandName}</span>
                          <Badge
                            variant="secondary"
                            className="h-5 rounded-full px-2 text-[10px] font-normal"
                          >
                            General
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Lihat seluruh data brand
                        </span>
                      </div>
                      {!activeBranchId && (
                        <Check className="size-4 shrink-0 text-sidebar-primary" />
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Branch section */}
                <div className="px-3 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Cabang
                  </span>
                </div>

                {branches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.id}
                    className="px-3 py-2.5"
                    disabled={isSwitching}
                    onClick={() => handleBranchSwitch(branch.id)}
                  >
                    <div className="grid flex-1 gap-0.5">
                      <span className="text-sm font-medium">
                        {branch.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {brandName}
                      </span>
                    </div>
                    {activeBranchId === branch.id && (
                      <Check className="size-4 shrink-0 text-sidebar-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <div className="relative min-h-0 flex-1 bg-sidebar">
        <SidebarContent className="h-full bg-sidebar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    data-tour="dashboard"
                    isActive={isActive("dashboard")}
                    tooltip="Dashboard"
                    className={
                      isActive("dashboard")
                        ? "bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground group-data-[collapsible=icon]:bg-background group-data-[collapsible=icon]:shadow-sm"
                        : ""
                    }
                    asChild
                  >
                    <Link href={`/${brandSlug}/panel/dashboard`} onClick={handleNavClick}>
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* AI Command Center — owner/master_admin only */}
                {(role === "MASTER_ADMIN" || role === "PLATFORM_OWNER") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isActive("ai")}
                      tooltip="AI Command Center"
                      className={
                        isActive("ai")
                          ? "bg-emerald-500/10 text-emerald-500 shadow-sm hover:bg-emerald-500/15 hover:text-emerald-500 group-data-[collapsible=icon]:bg-emerald-500/10 group-data-[collapsible=icon]:shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }
                      asChild
                    >
                      <Link href={`/${brandSlug}/panel/ai`} onClick={handleNavClick}>
                        <Sparkles className="size-4" />
                        <span>AI Command Center</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Collapsible nav groups */}
                {visibleGroups.map((group) => {
                  const isOpen = openGroups[group.label] ?? false;
                  const hasActiveChild = group.items.some((item) => isActive(item.href));
                  const Icon = group.icon;

                  return (
                    <React.Fragment key={group.label}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          tooltip={group.label}
                          onClick={() => toggleGroup(group.label)}
                          className={`cursor-pointer ${
                            hasActiveChild
                              ? "bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground data-[state=open]:bg-background data-[state=open]:text-foreground group-data-[collapsible=icon]:bg-background group-data-[collapsible=icon]:shadow-sm"
                              : ""
                          }`}
                        >
                          <Icon />
                          <span>{group.label}</span>
                          <ChevronRight
                            className={`ml-auto size-4 shrink-0 transition-transform duration-200 ${
                              hasActiveChild ? "text-foreground" : "text-muted-foreground"
                            } ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.ul
                            key={`${group.label}-submenu`}
                            data-sidebar="menu-sub"
                            variants={submenuContainerVariants}
                            initial="closed"
                            animate="open"
                            exit="closed"
                            className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 overflow-hidden border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden"
                          >
                            {group.items.map((item) => (
                              <motion.li
                                key={item.href}
                                variants={submenuItemVariants}
                              >
                                <SidebarMenuSubButton
                                  isActive={isActive(item.href)}
                                  asChild
                                >
                                  <Link
                                    href={`/${brandSlug}/panel/${item.href}`}
                                    data-tour={TOUR_ID_MAP[item.href] || undefined}
                                    onClick={handleNavClick}
                                  >
                                    <span>{item.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </motion.li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </SidebarMenu>

                {/* Documentation */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("documentation")}
                    tooltip="Documentation"
                    className={
                      isActive("documentation")
                        ? "bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground group-data-[collapsible=icon]:bg-background group-data-[collapsible=icon]:shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }
                    asChild
                  >
                    <Link href={`/${brandSlug}/panel/documentation`} onClick={handleNavClick}>
                      <BookOpen />
                      <span>Documentation</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-sidebar to-transparent group-data-[collapsible=icon]:hidden" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-7 bg-gradient-to-t from-sidebar to-transparent group-data-[collapsible=icon]:hidden" />
      </div>

      {/* ── Footer Actions ── */}
      <SidebarFooter className="bg-sidebar p-2">
        <SidebarMenu className="rounded-2xl bg-sidebar-accent/35 p-1.5 shadow-sm ring-1 ring-sidebar-border/50 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:shadow-none">
          <SidebarMenuItem>
            <ShiftCashWidget
              brandSlug={brandSlug}
              role={role as Role}
              canAccessAllBranches={canAccessAllBranches}
              grouped
              onOpenShift={() => window.dispatchEvent(new CustomEvent("seervis:open-shift-modal"))}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <AccountSwitcher brandSlug={brandSlug} role={role} authUserId={authUserId} activeOperatorId={activeOperatorId} activeOperatorName={activeOperatorName} userName={userName} userEmail={userEmail} avatarUrl={userAvatarUrl ?? null} restartTour={restartTour} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}

/* ─── Account Switcher ─── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AccountSwitcher({
  brandSlug,
  role,
  authUserId,
  activeOperatorId,
  activeOperatorName,
  userName,
  userEmail,
  avatarUrl,
  restartTour,
}: {
  brandSlug: string;
  role: string;
  authUserId: string;
  activeOperatorId: string | null;
  activeOperatorName: string | null;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  restartTour: () => void;
}) {
  const router = useRouter();
  const { setActiveBranchId } = useActiveBranch();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [rememberedAccounts, setRememberedAccounts] = React.useState<RememberedAccount[]>([]);
  const [loginModalOpen, setLoginModalOpen] = React.useState(false);
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const displayName = activeOperatorName ?? userName ?? "User";
  const displayRole = ROLE_LABELS[role as Role] ?? role;

  React.useEffect(() => {
    if (popoverOpen) {
      setRememberedAccounts(loadRememberedAccounts());
    }
  }, [popoverOpen]);

  type AccountSwitcherItem =
    | {
        type: "current";
        id: string;
        name: string;
        email: string;
        roleLabel: string;
      }
    | {
        type: "remembered";
        id: string;
        name: string;
        email: string;
        roleLabel: string;
        brandName?: string;
      };

  const combinedList = React.useMemo(() => {
    const items: AccountSwitcherItem[] = [];

    // Current account
    items.push({
      type: "current",
      id: activeOperatorId || authUserId || userEmail || "current-account",
      name: displayName,
      email: userEmail,
      roleLabel: displayRole,
    });

    const currentKey = `${userEmail}:${brandSlug}`;

    // Remembered accounts: filter invalid (no email) and deduplicate
    const seen = new Set<string>();
    seen.add(currentKey);

    const sorted = [...rememberedAccounts]
      .filter((acc) => !!acc.email)
      .sort(
        (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
      );

    for (let i = 0; i < sorted.length; i++) {
      const acc = sorted[i];
      const key = `${acc.email}:${acc.brandSlug ?? brandSlug}`;

      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        type: "remembered",
        id: acc.profileId || acc.authUserId || acc.email || `remembered-${i}`,
        name: acc.name,
        email: acc.email,
        roleLabel: acc.roleLabel,
        brandName: acc.brandName ?? undefined,
      });
    }

    return items;
  }, [rememberedAccounts, userEmail, brandSlug, displayName, displayRole, activeOperatorId, authUserId]);

  const openLoginModal = (email: string) => {
    setLoginEmail(email);
    setLoginPassword("");
    setLoginError(null);
    setLoginModalOpen(true);
    setPopoverOpen(false);
  };

  const handleLoginSubmit = async () => {
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (authError) {
        setLoginError(authError.message === "Invalid login credentials"
          ? "Email atau password salah."
          : authError.message);
        return;
      }

      // Record last_login_at (non-blocking)
      if (data?.user?.id) {
        updateLastLoginAt(supabase, data.user.id);
      }
      setLoginModalOpen(false);
      setActiveBranchId(null);
      window.localStorage.removeItem(`seervis:selected-branch:${brandSlug}`);
      window.location.href = `/${brandSlug}/panel/dashboard`;
    } catch {
      setLoginError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAddAccount = () => {
    openLoginModal("");
  };

  const handleRememberedAccountLogin = (email: string) => {
    openLoginModal(email);
  };

  const handleLogout = async () => {
    setIsSwitching(true);
    try {
      await logoutAction(brandSlug);
      window.location.href = "/login";
    } catch {
      // ignore
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="rounded-xl bg-background shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-background hover:shadow-md data-[state=open]:bg-background data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="size-8 rounded-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="aspect-square h-full w-full object-cover" /> : null}
              <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {displayRole}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-[260px] rounded-xl p-2 shadow-lg"
        >
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-foreground">
              Switch Account
            </p>
            <p className="text-[11px] text-muted-foreground">
              Pilih akun untuk mengganti operator aktif
            </p>
          </div>

          <div className="mt-1 max-h-[240px] space-y-1 overflow-y-auto">
            {combinedList.map((item) =>
              item.type === "current" ? (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 opacity-60"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/20 text-xs font-medium text-sidebar-primary">
                      {getInitials(item.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {item.name}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                        Current
                      </Badge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.roleLabel}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {item.email}
                    </p>
                  </div>
                  <Check className="size-4 shrink-0 text-sidebar-primary" />
                </div>
              ) : (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  disabled={isSwitching}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent disabled:opacity-50"
                  onClick={() => handleRememberedAccountLogin(item.email)}
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary">
                      {getInitials(item.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {item.name}
                      </p>
                      <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0">
                        Login required
                      </Badge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.roleLabel}{item.brandName ? ` — ${item.brandName}` : ""}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {item.email}
                    </p>
                  </div>
                </button>
              ),
            )}
          </div>

          <div className="mt-2 border-t pt-2">
            <button
              type="button"
              disabled={isSwitching}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-50"
              onClick={handleAddAccount}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30">
                <UserPlus className="size-4" />
              </span>
              Add Account
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
              onClick={() => router.push(`/${brandSlug}/panel/account`)}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30">
                <UserCog className="size-4" />
              </span>
              Pengaturan Akun
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
              onClick={restartTour}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30">
                <Compass className="size-4" />
              </span>
              Restart Guided Tour
            </button>
            <button
              type="button"
              disabled={isSwitching}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
              onClick={handleLogout}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-red-300">
                <LogOut className="size-4" />
              </span>
              Logout
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Login Modal ── */}
      <Dialog open={loginModalOpen} onOpenChange={(open) => { if (!loginLoading) { setLoginModalOpen(open); if (!open) setLoginError(null); } }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {loginEmail ? "Login ke akun" : "Tambah Akun"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {loginEmail
                ? `Masukkan password untuk ${loginEmail}`
                : "Masukkan email dan password akun yang ingin ditambahkan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="nama@email.com"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null); }}
                disabled={loginLoading}
                autoFocus={!loginEmail}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null); }}
                disabled={loginLoading}
                autoFocus={!!loginEmail}
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loginLoading) {
                    handleLoginSubmit();
                  }
                }}
              />
            </div>
            {loginError && (
              <p className="text-xs text-red-500">{loginError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLoginModalOpen(false); setLoginError(null); }}
              disabled={loginLoading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleLoginSubmit}
              disabled={!loginEmail || !loginPassword || loginLoading}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Masuk...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
