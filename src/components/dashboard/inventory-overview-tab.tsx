"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Package,
  ShoppingCart,
  Store,
  Wrench,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const stockMovementsToday = data?.stockMovementsToday;
  const topUsedSpareparts = data?.topUsedSpareparts ?? [];

  return (
    <div className="space-y-3">
      {/* ══ KPI 2x2 — no gap ══ */}
      <div className="grid grid-cols-2 gap-0 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs">
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
          label="Stok Terpakai"
          value={String(data?.stockUsedCount ?? 0)}
          helper="Total periode ini"
          icon={Package}
        />
        <SummaryCard
          label="Belanja Stok"
          value={formatRp(data?.stockPurchaseTotal ?? 0)}
          helper="Total pengeluaran"
          icon={ShoppingCart}
        />
      </div>

      {/* ══ CONTENT ROW ══ */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── LEFT: Low Stock Items ── */}
        <div className="space-y-3">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stok Menipis / Habis</CardTitle>
              <CardDescription className="text-xs">
                Produk dan sparepart yang perlu segera dicek atau direstock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {lowStockItems.slice(0, 8).map((item) => {
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
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">Semua stok dalam kondisi baik.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-3">
          {/* Stock Movements Today */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pergerakan Stok Hari Ini</CardTitle>
              <CardDescription className="text-xs">Total barang masuk & keluar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockMovementsToday ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/10">
                      <ArrowDown className="size-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-medium">Masuk</p>
                        <p className="text-lg font-bold tabular-nums text-emerald-600">{stockMovementsToday.in}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border bg-red-50/50 p-3 dark:bg-red-950/10">
                      <ArrowUp className="size-4 text-red-500" />
                      <div>
                        <p className="text-xs font-medium">Keluar</p>
                        <p className="text-lg font-bold tabular-nums text-red-500">{stockMovementsToday.out}</p>
                      </div>
                    </div>
                  </div>
                  {stockMovementsToday.byType.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Per Tipe</p>
                        {stockMovementsToday.byType.map((t) => (
                          <div key={t.type} className="flex items-center justify-between text-xs">
                            <span className="capitalize text-muted-foreground">{t.type.replace(/_/g, " ").toLowerCase()}</span>
                            <span className="tabular-nums">
                              <span className="text-emerald-600">+{t.in}</span>
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-red-500">-{t.out}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">Belum ada pergerakan stok hari ini.</p>
              )}
            </CardContent>
          </Card>

          {/* Top Used Spareparts */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Sparepart Terpopuler</CardTitle>
              <CardDescription className="text-xs">5 sparepart paling sering dipakai</CardDescription>
            </CardHeader>
            <CardContent>
              {topUsedSpareparts.length > 0 ? (
                <div className="space-y-2.5">
                  {topUsedSpareparts.map((part, i) => (
                    <div key={part.sku + part.itemName} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{part.itemName}</p>
                          <p className="truncate text-[10px] text-muted-foreground">SKU: {part.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs tabular-nums">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Wrench className="size-3" />
                          {part.usageCount}
                        </span>
                        <span className="font-medium">{part.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">Belum ada data pemakaian sparepart.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
