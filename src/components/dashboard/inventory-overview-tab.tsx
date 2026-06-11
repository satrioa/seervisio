"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
  Store,
  Hash,
  Boxes,
  ArrowRight,
  LogOut,
  RefreshCw,
  Clock,
  Banknote,
  Building2,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SummaryCard } from "@/components/dashboard/summary-card";

/* ── Mock data ── */

// ── KPI (keep existing) ──
const KPI_DATA = [
  { label: "Stok Menipis", value: "8", helper: "Perlu re-stock", icon: AlertCircle },
  { label: "Stok Habis", value: "3", helper: undefined as string | undefined, icon: AlertTriangle },
  { label: "Sparepart Terpakai", value: "14", helper: "Hari ini", icon: Package },
  { label: "Belanja Stok", value: "Rp 1.200.000", helper: "Bulan ini", icon: ShoppingCart },
];

// ── Low stock items ──
const LOW_STOCK_ITEMS = [
  {
    name: "Battery iPhone 11",
    sku: "SP-BAT-IP11",
    category: "Sparepart",
    currentStock: 2,
    minStock: 5,
    branch: "Semarang Pusat",
    status: "menipis" as const,
  },
  {
    name: "LCD iPhone XR",
    sku: "SP-LCD-IPXR",
    category: "Sparepart",
    currentStock: 0,
    minStock: 3,
    branch: "Semarang Pusat",
    status: "habis" as const,
  },
  {
    name: "Flexible Charger iPhone 12",
    sku: "SP-FLX-IP12",
    category: "Sparepart",
    currentStock: 1,
    minStock: 4,
    branch: "Salatiga",
    status: "menipis" as const,
  },
  {
    name: "Tempered Glass iPhone 13",
    sku: "ACC-TG-IP13",
    category: "Aksesoris",
    currentStock: 0,
    minStock: 10,
    branch: "Sragen",
    status: "habis" as const,
  },
];

// ── Recent sales ──
const RECENT_SALES = [
  { time: "10:24", product: "Tempered Glass iPhone 13", branch: "Semarang Pusat", qty: 2, total: 100000, metode: "QRIS" },
  { time: "10:02", product: "Softcase iPhone 11", branch: "Semarang Pusat", qty: 1, total: 75000, metode: "Cash" },
  { time: "09:45", product: "Charger Type-C 20W", branch: "Salatiga", qty: 1, total: 150000, metode: "Debit" },
  { time: "09:20", product: "Kabel Lightning", branch: "Sragen", qty: 3, total: 180000, metode: "Transfer" },
  { time: "08:55", product: "Anti Gores iPhone XR", branch: "Semarang Pusat", qty: 1, total: 50000, metode: "QRIS" },
];

// ── Riwayat Belanja ──
const RIWAYAT_BELANJA = [
  { supplier: "Toko Sparepart Semarang", date: "Hari ini, 09:30", total: 1200000, items: 6, status: "Selesai" as const },
  { supplier: "Distributor Aksesoris", date: "Kemarin, 16:10", total: 850000, items: 12, status: "Selesai" as const },
  { supplier: "Online Marketplace", date: "2 hari lalu", total: 430000, items: 4, status: "Pending" as const },
];

// ── Mutasi Stok ──
const MUTASI_STOK = [
  { tipe: "Keluar" as const, item: "Battery iPhone 11", qty: -1, waktu: "10:18", ref: "Servis SRV-1024" },
  { tipe: "Masuk" as const, item: "Charger Type-C 20W", qty: 10, waktu: "09:35", ref: "Belanja stok" },
  { tipe: "Keluar" as const, item: "Tempered Glass iPhone 13", qty: -2, waktu: "09:20", ref: "POS" },
  { tipe: "Adjustment" as const, item: "LCD iPhone XR", qty: -1, waktu: "Kemarin", ref: "Stock opname" },
  { tipe: "Masuk" as const, item: "Flexible Charger iPhone 12", qty: 5, waktu: "Kemarin", ref: "Transfer cabang" },
];

/* ── Helpers ── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export function InventoryOverviewTab() {
  const hasLowStock = LOW_STOCK_ITEMS.length > 0;
  const lowStockScrollRef = React.useRef<HTMLDivElement>(null);
  const lowStockDragRef = React.useRef({
    dragging: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    nextScrollLeft: 0,
  });
  const lowStockFrameRef = React.useRef<number | null>(null);

  const stopLowStockDrag = React.useCallback(() => {
    lowStockDragRef.current.dragging = false;
    lowStockDragRef.current.pointerId = -1;
    if (lowStockFrameRef.current !== null) {
      window.cancelAnimationFrame(lowStockFrameRef.current);
      lowStockFrameRef.current = null;
    }
  }, []);

  React.useEffect(() => stopLowStockDrag, [stopLowStockDrag]);

  const handleLowStockPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = lowStockScrollRef.current;
      if (!target) return;

      target.setPointerCapture(event.pointerId);
      lowStockDragRef.current = {
        dragging: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollLeft: target.scrollLeft,
        nextScrollLeft: target.scrollLeft,
      };
    },
    []
  );

  const handleLowStockPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = lowStockScrollRef.current;
      const drag = lowStockDragRef.current;
      if (!target || !drag.dragging || drag.pointerId !== event.pointerId) return;

      event.preventDefault();
      drag.nextScrollLeft = drag.scrollLeft - (event.clientX - drag.startX);

      if (lowStockFrameRef.current !== null) return;
      lowStockFrameRef.current = window.requestAnimationFrame(() => {
        target.scrollLeft = lowStockDragRef.current.nextScrollLeft;
        lowStockFrameRef.current = null;
      });
    },
    []
  );

  const handleLowStockPointerEnd = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = lowStockScrollRef.current;
      if (target?.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      stopLowStockDrag();
    },
    [stopLowStockDrag]
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ══ LEFT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── KPI Cards (unchanged) ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_DATA.map((kpi) => (
            <SummaryCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              helper={kpi.helper}
              icon={kpi.icon}
            />
          ))}
        </div>

        {/* ── Stok Menipis / Habis — conditionally rendered ── */}
        {hasLowStock && (
          <Card className="overflow-visible border-none shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stok Menipis / Habis</CardTitle>
              <CardDescription className="text-xs">
                Produk dan sparepart yang perlu segera dicek atau direstock
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-visible p-0">
              <div className="relative overflow-visible">
                <div className="pointer-events-none absolute inset-y-2 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute inset-y-2 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
                <div
                  ref={lowStockScrollRef}
                  className="flex cursor-grab touch-pan-x gap-3 overflow-x-auto px-1 pb-4 pt-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onPointerCancel={handleLowStockPointerEnd}
                  onPointerDown={handleLowStockPointerDown}
                  onPointerLeave={handleLowStockPointerEnd}
                  onPointerMove={handleLowStockPointerMove}
                  onPointerUp={handleLowStockPointerEnd}
                >
                  {LOW_STOCK_ITEMS.map((item) => {
                    const isHabis = item.status === "habis";
                    return (
                      <div
                        key={item.sku}
                        className="flex w-[260px] shrink-0 select-none flex-col gap-2.5 rounded-lg border bg-card p-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)]"
                      >
                      {/* Header: name + status */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-medium text-foreground">
                          {item.name}
                        </p>
                        <Badge
                          variant={isHabis ? "destructive" : "secondary"}
                          className="h-5 shrink-0 rounded-full px-2 text-[10px] font-normal"
                        >
                          {isHabis ? "Habis" : "Menipis"}
                        </Badge>
                      </div>

                      {/* SKU + Category */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate">{item.sku}</span>
                        <span>·</span>
                        <span className="shrink-0">{item.category}</span>
                      </div>

                      <Separator />

                      {/* Stock info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground">Stok</span>
                          <span className={isHabis ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                            {item.currentStock}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[10px] text-muted-foreground">Min. Stok</span>
                          <span className="font-semibold text-foreground">{item.minStock}</span>
                        </div>
                      </div>

                      {/* Branch */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Store className="size-3" />
                        <span className="truncate">{item.branch}</span>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {isHabis ? "Restock segera" : "Cek stok cabang lain"}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]">
                          Detail
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Recent Penjualan ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Penjualan</CardTitle>
            <CardDescription className="text-xs">
              Penjualan produk dan aksesoris terbaru
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-3 text-[10px] font-medium text-muted-foreground">Waktu</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium text-muted-foreground">Produk</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium text-muted-foreground">Cabang</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium text-muted-foreground text-right">Qty</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium text-muted-foreground text-right">Total</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium text-muted-foreground">Metode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_SALES.map((sale, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground">{sale.time}</TableCell>
                    <TableCell className="px-3 py-2 text-xs font-medium text-foreground">{sale.product}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground">{sale.branch}</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-right tabular-nums">{sale.qty}x</TableCell>
                    <TableCell className="px-3 py-2 text-xs text-right tabular-nums font-medium">{formatRp(sale.total)}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant={sale.metode === "QRIS" ? "default" : sale.metode === "Debit" ? "secondary" : "outline"} className="h-5 rounded-full px-2 text-[10px] font-normal">
                        {sale.metode}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ══ RIGHT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── Riwayat Belanja ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Riwayat Belanja</CardTitle>
            <CardDescription className="text-xs">
              Pembelian stok terbaru
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {RIWAYAT_BELANJA.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Separator />}
                <div className="flex flex-col gap-1.5 px-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-foreground">{item.supplier}</span>
                    <Badge
                      variant={item.status === "Selesai" ? "outline" : "default"}
                      className="h-5 shrink-0 rounded-full px-2 text-[10px] font-normal"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="size-3 shrink-0" />
                    <span className="truncate">{item.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.items} item</span>
                    <span className="font-medium tabular-nums text-foreground">{formatRp(item.total)}</span>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        {/* ── Mutasi Stok ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Mutasi Stok</CardTitle>
            <CardDescription className="text-xs">
              Keluar, masuk, dan penyesuaian stok terbaru
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-[10px] font-medium text-muted-foreground">Tipe</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-medium text-muted-foreground">Item</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-medium text-muted-foreground text-right">Qty</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-medium text-muted-foreground">Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MUTASI_STOK.map((mov, i) => {
                  const isMasuk = mov.tipe === "Masuk";
                  const isKeluar = mov.tipe === "Keluar";
                  return (
                    <TableRow key={i}>
                      <TableCell className="px-2 py-2">
                        <Badge
                          variant={isMasuk ? "default" : isKeluar ? "destructive" : "secondary"}
                          className="h-5 gap-1 rounded-full px-2 text-[10px] font-normal"
                        >
                          {isMasuk ? (
                            <ArrowRight className="size-3" />
                          ) : isKeluar ? (
                            <LogOut className="size-3" />
                          ) : (
                            <RefreshCw className="size-3" />
                          )}
                          {mov.tipe}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[120px] px-2 py-2">
                        <p className="truncate text-xs text-foreground">{mov.item}</p>
                        <p className="truncate text-[9px] text-muted-foreground">{mov.ref}</p>
                      </TableCell>
                      <TableCell className={`px-2 py-2 text-right text-xs tabular-nums ${mov.qty < 0 ? "text-destructive" : ""}`}>
                        {mov.qty > 0 ? `+${mov.qty}` : mov.qty}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-[10px] text-muted-foreground whitespace-nowrap">
                        {mov.waktu}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
