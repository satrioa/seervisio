"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Package,
  ShoppingCart,
  Banknote,
  Clock,
  Wallet,
  CreditCard,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "services", label: "Service", icon: Wrench },
  { href: "inventory", label: "Inventory", icon: Package },
  { href: "pos", label: "POS", icon: ShoppingCart },
  { href: "finance", label: "Finance", icon: Banknote },
  { href: "store-shifts", label: "Shift", icon: Clock },
  { href: "payment-accounts", label: "Akun Bayar", icon: Wallet },
  { href: "payment-methods", label: "Metode Bayar", icon: CreditCard },
  { href: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  brandSlug: string;
}

export function AppSidebar({ brandSlug }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href={`/${brandSlug}/panel/dashboard`}
          className="text-lg font-bold"
        >
          Seervis
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.includes(item.href);
          return (
            <Link
              key={item.href}
              href={`/${brandSlug}/panel/${item.href}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
