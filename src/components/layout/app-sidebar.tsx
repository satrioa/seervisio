"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Plus,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* ── Mock branch data ── */
interface BranchOption {
  id: string;
  name: string;
}

const BRANCHES: BranchOption[] = [
  { id: "semarang-pusat", name: "Semarang Pusat" },
  { id: "salatiga", name: "Salatiga" },
  { id: "sragen", name: "Sragen" },
];

type ScopeId = "general" | BranchOption["id"];

const ACCOUNTS = [
  {
    id: "master-admin",
    initials: "MA",
    name: "Master Admin",
    role: "MASTER_ADMIN",
  },
  {
    id: "store-admin",
    initials: "SA",
    name: "Store Admin",
    role: "STORE_ADMIN",
  },
  {
    id: "cashier",
    initials: "CS",
    name: "Cashier",
    role: "CASHIER",
  },
];

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
      { href: "store-shifts", label: "Store Shift" },
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
}

export function AppSidebar({ brandSlug }: AppSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );
  const [selectedScope, setSelectedScope] = React.useState<ScopeId>("general");
  const [currentSection, setCurrentSection] = React.useState<string | null>(null);

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
            <DropdownMenu>
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
                {/* General (all branches) */}
                <DropdownMenuItem
                  className="gap-2.5 p-3"
                  onClick={() => setSelectedScope("general")}
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
                  {selectedScope === "general" && (
                    <Check className="size-4 shrink-0 text-sidebar-primary" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Branch section */}
                <div className="px-3 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Cabang
                  </span>
                </div>

                {BRANCHES.map((branch) => (
                  <DropdownMenuItem
                    key={branch.id}
                    className="px-3 py-2.5"
                    onClick={() => setSelectedScope(branch.id)}
                  >
                    <div className="grid flex-1 gap-0.5">
                      <span className="text-sm font-medium">
                        {branch.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Kasservice
                      </span>
                    </div>
                    {selectedScope === branch.id && (
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
      <SidebarContent className="!bg-[#f3f2f0]">
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
              {COLLAPSIBLE_GROUPS.map((group) => {
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
      <SidebarFooter className="!bg-[#f3f2f0] p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="rounded-xl bg-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-md data-[state=open]:bg-white data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary">
                      MA
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Master Admin</span>
                    <span className="truncate text-xs text-muted-foreground">
                      MASTER_ADMIN
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="top"
                sideOffset={8}
                className="w-[220px] rounded-xl p-2 shadow-lg"
              >
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    Switch Account
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih akun untuk melanjutkan
                  </p>
                </div>

                <div className="mt-1 space-y-1">
                  {ACCOUNTS.map((account) => {
                    const isActiveAccount = account.id === "master-admin";
                    return (
                      <button
                        key={account.id}
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
                      >
                        <Avatar className="size-8 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-xs font-medium text-sidebar-primary">
                            {account.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {account.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {account.role}
                          </p>
                        </div>
                        {isActiveAccount && (
                          <Check className="size-4 shrink-0 text-sidebar-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 border-t pt-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed">
                      <Plus className="size-4" />
                    </span>
                    Add Account
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
