"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

// Permission key for each nav item
function itemPermission(href: string): string | null {
  if (href === "dashboard") return null; // always visible
  if (href === "services") return "service.view";
  if (href === "customers") return "customer.view";
  if (href === "pos") return "pos.view";
  if (href === "store-shift") return "store_shift.view";
  if (href === "inventory") return "inventory.view";
  if (href === "stock-reports") return "inventory.view";
  if (href === "finance") return "finance.view";
  if (href === "payment-accounts") return "payment_account.view";
  if (href === "payment-methods") return "payment.method.manage";
  if (href === "branches") return "branch.manage";
  if (href === "accounts") return "user.manage";
  if (href === "technician-performance") return "service.view";
  if (href === "audit-log") return "audit_log.view";
  if (href.startsWith("settings")) return "settings.manage";
  return null;
}

function filterItemsByRole(items: { href: string; label: string }[], role: Role): { href: string; label: string }[] {
  return items.filter((item) => {
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

/* ── Nav data ── */
interface SubNavItem {
  href: string;
  label: string;
}

interface CollapsibleGroup {
  label: string;
  icon: React.ElementType;
  items: SubNavItem[];
}

const COLLAPSIBLE_GROUPS: CollapsibleGroup[] = [
  {
    label: "Operation",
    icon: Wrench,
    items: [
      { href: "services", label: "Service" },
      { href: "customers", label: "Customers" },
      { href: "pos", label: "POS" },
      { href: "store-shift", label: "Store Shift" },
    ],
  },
  {
    label: "Stok Manajemen",
    icon: Package,
    items: [
      { href: "inventory", label: "Inventory" },
      { href: "stock-reports", label: "Laporan Stok" },
    ],
  },
  {
    label: "Finance",
    icon: Banknote,
    items: [
      { href: "finance", label: "Laporan Keuangan" },
      { href: "payment-accounts", label: "Payment Account" },
      { href: "payment-methods", label: "Payment Method" },
    ],
  },
  {
    label: "Management",
    icon: Users,
    items: [
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
      { href: "settings?section=target-goal", label: "Target & Goal" },
      { href: "settings?section=payment", label: "Payment Settings" },
      { href: "settings?section=payment-methods", label: "Payment Method" },
      { href: "settings?section=user-access", label: "User & Access" },
      { href: "settings?section=system", label: "System" },
    ],
  },
];

interface AppSidebarProps {
  brandSlug: string;
  role: string;
  canAccessAllBranches: boolean;
  authUserId: string;
  activeOperatorId: string | null;
  activeOperatorName: string | null;
  userName: string;
  userEmail: string;
}

export function AppSidebar({ brandSlug, role, canAccessAllBranches, authUserId, activeOperatorId, activeOperatorName, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );
  const [currentSection, setCurrentSection] = React.useState<string | null>(null);
  const { activeBranchId, activeBranchName, branches, setActiveBranchId, isSwitching, setIsSwitching } = useActiveBranch();

  const handleBranchSwitch = React.useCallback(async (branchId: string | null) => {
    if (isSwitching) return;
    if (branchId === activeBranchId) return;

    const targetBranch = branches.find(b => b.id === branchId);
    const fromName = activeBranchName ?? "Semua Cabang";
    const toName = targetBranch?.name ?? "Semua Cabang";

    setIsSwitching(true);
    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Mengganti cabang...",
      description: `${fromName} → ${toName}`,
    });

    try {
      // Simulate slight delay for better UX feel
      await new Promise(resolve => setTimeout(resolve, 800));

      setActiveBranchId(branchId);
      router.refresh();

      triggerDynamicIslandFeedback({
        type: "success",
        title: "Berhasil pindah cabang",
        description: `Sekarang: ${toName}`,
        duration: 2000,
      });
    } catch (error) {
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Gagal pindah cabang",
        description: "Cabang tidak dapat diakses",
        duration: 3000,
      });
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, activeBranchId, branches, activeBranchName, setIsSwitching, setActiveBranchId, router]);

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
    if (href.includes("?section=")) {
      const [pathPart, queryPart] = href.split("?");
      const targetParams = new URLSearchParams(queryPart);
      const targetSection = targetParams.get("section");
      return pathname?.includes(pathPart) && currentSection === targetSection;
    }
    return pathname?.includes(href);
  }

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
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <span className="text-sm font-bold">K</span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Kasservice</span>
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
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                        K
                      </div>
                      <div className="grid flex-1 gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Kasservice</span>
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
                        Kasservice
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
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("dashboard")}
                  tooltip="Dashboard"
                  asChild
                >
                  <Link href={`/${brandSlug}/panel/dashboard`}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Collapsible nav groups */}
              {visibleGroups.map((group) => {
                const isOpen = openGroups[group.label] ?? false;
                const Icon = group.icon;

                return (
                  <React.Fragment key={group.label}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip={group.label}
                        onClick={() => toggleGroup(group.label)}
                        className="cursor-pointer"
                      >
                        <Icon />
                        <span>{group.label}</span>
                        <ChevronRight
                          className={`ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? "rotate-90" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {isOpen && (
                      <SidebarMenuSub>
                        {group.items.map((item) => (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              isActive={isActive(item.href)}
                              asChild
                            >
                              <Link
                                href={`/${brandSlug}/panel/${item.href}`}
                              >
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User Profile Footer ── */}
      <SidebarFooter className="bg-sidebar p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountSwitcher brandSlug={brandSlug} role={role} authUserId={authUserId} activeOperatorId={activeOperatorId} activeOperatorName={activeOperatorName} userName={userName} userEmail={userEmail} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
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
}: {
  brandSlug: string;
  role: string;
  authUserId: string;
  activeOperatorId: string | null;
  activeOperatorName: string | null;
  userName: string;
  userEmail: string;
}) {
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
