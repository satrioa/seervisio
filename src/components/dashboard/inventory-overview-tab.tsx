"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SummaryCard } from "@/components/dashboard/summary-card";
import type { DashboardInventory } from "@/server/actions/dashboard.actions";

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface InventoryOverviewTabProps {
  data: DashboardInventory | null;
}

export function InventoryOverviewTab({ data }: InventoryOverviewTabProps) {
  const lowStockItems = data?.lowStockItems ?? [];
  const hasLowStock = lowStockItems.length > 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ══ LEFT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── KPI Cards ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Stok Menipis"
            value={String(data?.lowStockCount ?? 0)}
            helper="Perlu re-stock"
            icon={AlertCircle}
          />
          <SummaryCard
            label="Stok Habis"
            value={String(data?.outOfStockCount ?? 0)}
            helper={undefined}
            icon={AlertTriangle}
          />
          <SummaryCard
            label="Sparepart Terpakai"
            value={String(data?.stockUsedCount ?? 0)}
            helper="Hari ini"
            icon={Package}
          />
          <SummaryCard
            label="Belanja Stok"
            value={formatRp(data?.stockPurchaseTotal ?? 0)}
            helper="Total pengeluaran"
            icon={ShoppingCart}
          />
        </div>

        {/* ── Stok Menipis / Habis ── */}
        {hasLowStock && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stok Menipis / Habis</CardTitle>
              <CardDescription className="text-xs">
                Produk dan sparepart yang perlu segera dicek atau direstock
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {lowStockItems.slice(0, 5).map((item) => {
                const isHabis = item.status === "habis";
                return (
                  <div key={item.sku + item.name} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                        <Badge
                          variant={isHabis ? "destructive" : "secondary"}
                          className="h-5 shrink-0 rounded-full px-2 text-[10px] font-normal"
                        >
                          {isHabis ? "Habis" : "Menipis"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{item.sku}</span>
                        <span>·</span>
                        <span>{item.category}</span>
                        <span>·</span>
                        <Store className="size-3" />
                        <span>{item.branch}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs font-semibold tabular-nums">{item.currentStock}</span>
                      <span className="text-[10px] text-muted-foreground">/ min {item.minStock}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Empty state when no low stock items */}
        {!hasLowStock && (
          <Card className="shadow-xs">
            <CardContent className="flex h-32 items-center justify-center">
              <p className="text-xs text-muted-foreground">Semua stok dalam kondisi baik.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ══ RIGHT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── Riwayat Belanja ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Ringkasan Inventory</CardTitle>
            <CardDescription className="text-xs">
              Ringkasan stok dan pengeluaran
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total item menipis</span>
              <span className="font-medium">{data?.lowStockCount ?? 0}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total item habis</span>
              <span className="font-medium text-destructive">{data?.outOfStockCount ?? 0}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Sparepart terpakai hari ini</span>
              <span className="font-medium">{data?.stockUsedCount ?? 0}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total belanja stok</span>
              <span className="font-medium">{formatRp(data?.stockPurchaseTotal ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
