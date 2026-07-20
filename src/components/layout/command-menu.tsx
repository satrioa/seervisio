"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { globalSearchAction, type GlobalSearchResult } from "@/server/actions/global-search.actions";
import {
  ArrowRight,
  Wrench,
  ShoppingCart,
  PackagePlus,
  Package,
  UserPlus,
  WrenchIcon,
  Store,
  StoreIcon,
  Wallet,
  TrendingUp,
  ClipboardCheck,
  LayoutDashboard,
  Container,
  Users,
  Landmark,
  Building2,
  UserCog,
  Settings,
  ScrollText,
  Timer,
  Star,
  Loader2,
  SearchIcon,
  ShieldCheck,
} from "lucide-react";

/* ─── Types ─── */

interface CommandMenuProps {
  brandSlug: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

interface RecentItem {
  id: string;
  label: string;
  description?: string;
  icon: string;
  href?: string;
  action?: string;
}

type FavoriteItem = RecentItem;

/* ─── Constants ─── */

const RECENT_KEY = "seervis:command-recent";
const FAVORITES_KEY = "seervis:command-favorites";
const MAX_RECENT = 10;

/* ─── Helpers ─── */

function loadRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch { /* noop */ }
}

function addRecent(item: RecentItem) {
  const items = loadRecent().filter((r) => r.id !== item.id);
  items.unshift(item);
  saveRecent(items);
}

function loadFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  } catch { /* noop */ }
}

function toggleFavorite(item: FavoriteItem) {
  const items = loadFavorites();
  const existing = items.findIndex((f) => f.id === item.id);
  if (existing >= 0) {
    items.splice(existing, 1);
  } else {
    items.push(item);
  }
  saveFavorites(items);
  return existing < 0;
}

/* ─── Quick Actions ─── */

function getQuickActions(brandSlug: string, router: ReturnType<typeof useRouter>): QuickAction[] {
  return [
    {
      id: "add-service",
      label: "Tambah Servis",
      icon: Wrench,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:open-create-service"));
        addRecent({ id: "add-service", label: "Tambah Servis", icon: "wrench", action: "add-service" });
      },
    },
    {
      id: "create-sale",
      label: "Buat Penjualan",
      icon: ShoppingCart,
      action: () => {
        router.push(`/${brandSlug}/panel/pos-v4`);
        addRecent({ id: "create-sale", label: "Buat Penjualan", icon: "shopping-cart", href: `/${brandSlug}/panel/pos-v4` });
      },
    },
    {
      id: "add-stock",
      label: "Tambah Stok",
      icon: PackagePlus,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:open-add-stock"));
        addRecent({ id: "add-stock", label: "Tambah Stok", icon: "package-plus", action: "add-stock" });
      },
    },
    {
      id: "purchase-stock",
      label: "Pembelian Stok",
      icon: Package,
      action: () => {
        router.push(`/${brandSlug}/panel/inventory-v4`);
        addRecent({ id: "purchase-stock", label: "Pembelian Stok", icon: "package", href: `/${brandSlug}/panel/inventory-v4` });
      },
    },
    {
      id: "add-customer",
      label: "Tambah Customer",
      icon: UserPlus,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:open-create-customer"));
        addRecent({ id: "add-customer", label: "Tambah Customer", icon: "user-plus", action: "add-customer" });
      },
    },
    {
      id: "add-technician",
      label: "Tambah Teknisi",
      icon: WrenchIcon,
      action: () => {
        router.push(`/${brandSlug}/panel/accounts`);
        addRecent({ id: "add-technician", label: "Tambah Teknisi", icon: "wrench", href: `/${brandSlug}/panel/accounts` });
      },
    },
    {
      id: "open-store",
      label: "Buka Toko",
      icon: Store,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:open-shift-modal"));
        addRecent({ id: "open-store", label: "Buka Toko", icon: "store", action: "open-store" });
      },
    },
    {
      id: "close-store",
      label: "Tutup Toko",
      icon: StoreIcon,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:close-shift-modal"));
        addRecent({ id: "close-store", label: "Tutup Toko", icon: "store", action: "close-store" });
      },
    },
    {
      id: "add-income",
      label: "Catat Pemasukan",
      icon: TrendingUp,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:open-add-income"));
        addRecent({ id: "add-income", label: "Catat Pemasukan", icon: "trending-up", action: "add-income" });
      },
    },
    {
      id: "add-expense",
      label: "Catat Pengeluaran",
      icon: Wallet,
      action: () => {
        window.dispatchEvent(new CustomEvent("seervis:open-add-expense"));
        addRecent({ id: "add-expense", label: "Catat Pengeluaran", icon: "wallet", action: "add-expense" });
      },
    },
    {
      id: "stock-opname",
      label: "Stock Opname",
      icon: ClipboardCheck,
      action: () => {
        router.push(`/${brandSlug}/panel/inventory-v4`);
        addRecent({ id: "stock-opname", label: "Stock Opname", icon: "clipboard-check", href: `/${brandSlug}/panel/inventory-v4` });
      },
    },
  ];
}

/* ─── Navigation Items ─── */

function getNavItems(brandSlug: string): NavItem[] {
  return [
    { id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, href: `/${brandSlug}/panel/dashboard` },
    { id: "nav-services", label: "Servis", icon: Wrench, href: `/${brandSlug}/panel/services` },
    { id: "nav-pos", label: "Kasir (POS)", icon: ShoppingCart, href: `/${brandSlug}/panel/pos-v4` },
    { id: "nav-inventory", label: "Inventori", icon: Container, href: `/${brandSlug}/panel/inventory-v4` },
    { id: "nav-customers", label: "Customer", icon: Users, href: `/${brandSlug}/panel/customers` },
    { id: "nav-finance", label: "Keuangan", icon: Landmark, href: `/${brandSlug}/panel/finance` },
    { id: "nav-report", label: "Laporan", icon: TrendingUp, href: `/${brandSlug}/panel/finance` },
    { id: "nav-branches", label: "Cabang", icon: Building2, href: `/${brandSlug}/panel/branches` },
    { id: "nav-accounts", label: "Akun", icon: UserCog, href: `/${brandSlug}/panel/accounts` },
    { id: "nav-settings", label: "Pengaturan", icon: Settings, href: `/${brandSlug}/panel/settings` },
    { id: "nav-audit", label: "Audit Log", icon: ScrollText, href: `/${brandSlug}/panel/audit-log` },
  ];
}

/* ─── Icon Resolver ─── */

function resolveIcon(name: string): React.ElementType {
  const icons: Record<string, React.ElementType> = {
    wrench: Wrench,
    "shopping-cart": ShoppingCart,
    "package-plus": PackagePlus,
    package: Package,
    "user-plus": UserPlus,
    store: Store,
    trendingup: TrendingUp,
    wallet: Wallet,
    "clipboard-check": ClipboardCheck,
    dashboard: LayoutDashboard,
    container: Container,
    users: Users,
    landmark: Landmark,
    building2: Building2,
    usercog: UserCog,
    settings: Settings,
    scrolltext: ScrollText,
    search: SearchIcon,
    timer: Timer,
    star: Star,
    shieldcheck: ShieldCheck,
  };
  return icons[name.toLowerCase().replace(/[^a-z]/g, "")] || ArrowRight;
}

/* ─── Component ─── */

export function CommandMenu({ brandSlug }: CommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GlobalSearchResult>({ services: [], customers: [], products: [] });
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setFavorites(loadFavorites());
      setSearch("");
      setResults({ services: [], customers: [], products: [] });
    }
  }, [open]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults({ services: [], customers: [], products: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await globalSearchAction(brandSlug, value.trim());
        if (res.success) setResults(res.data);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [brandSlug]);

  const handleSelect = useCallback((value: string) => {
    const [type, ...idParts] = value.split(":");
    const id = idParts.join(":");

    if (type === "quick") {
      const actions = getQuickActions(brandSlug, router);
      const action = actions.find((a) => a.id === id);
      action?.action();
      setOpen(false);
      return;
    }

    if (type === "nav") {
      const items = getNavItems(brandSlug);
      const item = items.find((n) => n.id === id);
      if (item) {
        addRecent({ id: item.id, label: item.label, icon: "search", href: item.href });
        router.push(item.href);
        setOpen(false);
      }
      return;
    }

    if (type === "service") {
      addRecent({ id: `service:${id}`, label: `Servis ${id}`, icon: "wrench", href: `/${brandSlug}/panel/services` });
      router.push(`/${brandSlug}/panel/services`);
      setOpen(false);
      return;
    }

    if (type === "customer") {
      router.push(`/${brandSlug}/panel/customers`);
      setOpen(false);
      return;
    }

    if (type === "product") {
      router.push(`/${brandSlug}/panel/inventory-v4`);
      setOpen(false);
      return;
    }

    if (type === "recent") {
      const recentItem = loadRecent().find((r) => r.id === id);
      if (recentItem) {
        if (recentItem.href) router.push(recentItem.href);
        if (recentItem.action) {
          window.dispatchEvent(new CustomEvent(`seervis:${recentItem.action}`));
        }
        setOpen(false);
      }
      return;
    }

    if (type === "favorite-toggle") {
      const favItem = loadFavorites().find((f) => f.id === id);
      if (favItem) {
        toggleFavorite(favItem);
        setFavorites(loadFavorites());
      }
      return;
    }
  }, [brandSlug, router]);

  const actions = getQuickActions(brandSlug, router);
  const navItems = getNavItems(brandSlug);
  const hasSearchResults = results.services.length > 0 || results.customers.length > 0 || results.products.length > 0;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-8 w-48 min-w-0 justify-start gap-2 rounded-lg border border-border/50 bg-sidebar-accent/30 px-3 text-left text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground max-[420px]:w-9 max-[420px]:justify-center max-[420px]:px-0 sm:w-56"
        aria-label="Buka Command Menu"
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate max-[420px]:hidden">Cari atau jalankan...</span>
        <Kbd className="ml-auto max-[420px]:hidden">Ctrl+K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Menu"
        description="Cari atau jalankan perintah..."
      >
        <Command shouldFilter={!search.trim()} className="rounded-lg border-none shadow-none">
          <CommandInput
            placeholder="Cari atau jalankan perintah..."
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {search.trim() && (
              <>
                {searching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!searching && !hasSearchResults && (
                  <CommandEmpty>
                    Tidak ditemukan hasil untuk &quot;{search}&quot;
                  </CommandEmpty>
                )}

                {results.products.length > 0 && (
                  <CommandGroup heading="📦 Produk">
                    {results.products.map((p) => (
                      <CommandItem
                        key={`product:${p.id}`}
                        value={`product:${p.id}`}
                        onSelect={handleSelect}
                      >
                        <Package className="size-4" />
                        <span>{p.name}</span>
                        {p.sku && (
                          <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>
                        )}
                        <CommandShortcut>↵</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results.services.length > 0 && (
                  <CommandGroup heading="🛠 Servis">
                    {results.services.map((s) => (
                      <CommandItem
                        key={`service:${s.id}`}
                        value={`service:${s.id}`}
                        onSelect={handleSelect}
                      >
                        <Wrench className="size-4" />
                        <span className="font-mono text-xs">{s.serviceNumber}</span>
                        <span className="ml-1.5 truncate">{s.deviceModel || s.customerName || ""}</span>
                        {s.customerName && s.deviceModel && (
                          <span className="ml-1.5 text-xs text-muted-foreground">— {s.customerName}</span>
                        )}
                        <CommandShortcut>↵</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {results.customers.length > 0 && (
                  <CommandGroup heading="👤 Customer">
                    {results.customers.map((c) => (
                      <CommandItem
                        key={`customer:${c.id}`}
                        value={`customer:${c.id}`}
                        onSelect={handleSelect}
                      >
                        <Users className="size-4" />
                        <span>{c.name}</span>
                        {c.phone && (
                          <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                        )}
                        <CommandShortcut>↵</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}

            {!search.trim() && (
              <>
                <CommandGroup heading="⚡ Aksi Cepat">
                  {actions.map((a) => (
                    <CommandItem
                      key={`quick:${a.id}`}
                      value={`quick:${a.id}`}
                      onSelect={handleSelect}
                    >
                      <a.icon className="size-4" />
                      <span>{a.label}</span>
                      <CommandShortcut>↵</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="📂 Navigasi">
                  {navItems.map((n) => (
                    <CommandItem
                      key={`nav:${n.id}`}
                      value={`nav:${n.id}`}
                      onSelect={handleSelect}
                    >
                      <n.icon className="size-4" />
                      <span>{n.label}</span>
                      <CommandShortcut>↵</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>

                {recent.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="🕒 Terakhir Dibuka">
                      {recent.map((r) => {
                        const Icon = resolveIcon(r.icon);
                        return (
                          <CommandItem
                            key={`recent:${r.id}`}
                            value={`recent:${r.id}`}
                            onSelect={handleSelect}
                          >
                            <Icon className="size-4" />
                            <span>{r.label}</span>
                            {r.description && (
                              <span className="ml-2 text-xs text-muted-foreground">{r.description}</span>
                            )}
                            <CommandShortcut>↵</CommandShortcut>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}

                {favorites.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="⭐ Favorit">
                      {favorites.map((f) => {
                        const Icon = resolveIcon(f.icon);
                        return (
                          <CommandItem
                            key={`favorite-toggle:${f.id}`}
                            value={`favorite-toggle:${f.id}`}
                            onSelect={handleSelect}
                          >
                            <Icon className="size-4" />
                            <span>{f.label}</span>
                            <CommandShortcut>↵</CommandShortcut>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}

                {recent.length === 0 && favorites.length === 0 && (
                  <div className="px-6 py-8 text-center text-xs text-muted-foreground">
                    Mulai ketik untuk mencari...
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
