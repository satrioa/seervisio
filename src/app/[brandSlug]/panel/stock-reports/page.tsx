"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle, Loader2, Download, Package, Wallet, Layers,
  ArrowDownRight, ArrowUpRight, ArrowRightLeft, ShoppingCart, Cpu, Search,
  ChevronLeft, ChevronRight, Boxes, TrendingUp,
} from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  getV4InventoryStockSummaryAction,
  getV4InventoryValuationAction,
  getV4MovementSummaryAction,
  getV4StockPurchaseSummaryAction,
  getV4UnitSecondSummaryAction,
  getV4InventoryReportTotalsAction,
  exportStockReportCSVAction,
} from "@/server/actions/reporting-v4.actions";
import type {
  V4InventoryStockSummaryRow,
  V4InventoryValuationRow,
  V4InventoryMovementSummaryRow,
  V4StockPurchaseSummaryRow,
  V4UnitSecondSummaryRow,
  V4InventoryReportTotals,
} from "@/server/domain/reporting-v4.types";
import { movementTypeLabel, movementDirectionLabel, unitStatusLabel, productKindLabel } from "@/server/domain/inventory-v4.mapper";

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return value; }
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return value; }
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

type TabKey = "stock" | "valuation" | "movements" | "purchases" | "units";

const PRODUCT_KIND_OPTIONS = [
  { value: "", label: "Semua Jenis" },
  { value: "SPAREPART", label: "Sparepart" },
  { value: "PRODUCT", label: "Produk" },
  { value: "UNIT", label: "Unit" },
];

const STOCK_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "OK", label: "Aman" },
  { value: "LOW_STOCK", label: "Menipis" },
  { value: "OUT_OF_STOCK", label: "Habis" },
];

const PURCHASE_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "VOIDED", label: "Dibatalkan" },
];

const MOVEMENT_TYPE_OPTIONS = [
  { value: "", label: "Semua Tipe" },
  { value: "OPENING_STOCK", label: "Stok Awal" },
  { value: "PURCHASE_IN", label: "Pembelian" },
  { value: "STOCK_OPNAME_IN", label: "Opname Masuk" },
  { value: "STOCK_OPNAME_OUT", label: "Opname Keluar" },
  { value: "SERVICE_USAGE", label: "Pemakaian Servis" },
  { value: "POS_SALE", label: "Penjualan POS" },
  { value: "UNIT_IN", label: "Unit Masuk" },
  { value: "UNIT_STATUS_CHANGE", label: "Ubah Status Unit" },
  { value: "UNIT_SOLD", label: "Unit Terjual" },
  { value: "VOID_REVERSAL", label: "Void" },
  { value: "ADJUSTMENT", label: "Penyesuaian" },
];

const UNIT_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "READY_STOCK", label: "Ready" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD", label: "Terjual" },
  { value: "IN_SERVICE", label: "Dipakai Servis" },
  { value: "DEFECTIVE", label: "Rusak" },
  { value: "RETURNED", label: "Retur" },
  { value: "ARCHIVED", label: "Arsip" },
];

function StockStatusBadge({ status }: { status: string }) {
  if (status === "LOW_STOCK") {
    return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-500">Menipis</Badge>;
  }
  if (status === "OUT_OF_STOCK") {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Habis</Badge>;
  }
  return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-500">Aman</Badge>;
}

function KpiCard({ label, value, icon: Icon, color, loading }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`size-4 shrink-0 ${color}`} />
        </div>
        <span className={`text-xl font-semibold tabular-nums ${color}`}>
          {loading ? <Skeleton className="h-7 w-28" /> : value}
        </span>
      </CardContent>
    </Card>
  );
}

export default function StockReportsPage() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { branches } = useActiveBranch();

  const [activeTab, setActiveTab] = useState<TabKey>("stock");

  const [branchFilter, setBranchFilter] = useState("ALL_BRANCHES");
  const [productKind, setProductKind] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totals, setTotals] = useState<V4InventoryReportTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const dateTab = activeTab === "movements" || activeTab === "purchases";
  const useStatus = activeTab !== "valuation";
  const useProductKind = activeTab !== "purchases" && activeTab !== "units";

  const filter = useMemo(() => {
    const branchId = branchFilter === "ALL_BRANCHES" ? null : branchFilter;
    const opt = (v: string | null | undefined) => v || undefined;
    return {
      branchId,
      productKind: opt(useProductKind ? productKind : null),
      status: opt(useStatus ? statusFilter : null),
      dateFrom: opt(dateTab ? dateFrom : null),
      dateTo: opt(dateTab ? dateTo : null),
      page,
      pageSize,
    };
  }, [branchFilter, productKind, statusFilter, dateFrom, dateTo, page, pageSize, dateTab, useStatus, useProductKind]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fetchRows = async (): Promise<{ rows: any[]; total: number } | null> => {
      switch (activeTab) {
        case "stock": {
          const r = await getV4InventoryStockSummaryAction(brandSlug, filter);
          return r.success ? { rows: r.data.data, total: r.data.total } : null;
        }
        case "valuation": {
          const r = await getV4InventoryValuationAction(brandSlug, filter);
          return r.success ? { rows: r.data.data, total: r.data.total } : null;
        }
        case "movements": {
          const r = await getV4MovementSummaryAction(brandSlug, filter);
          return r.success ? { rows: r.data.data, total: r.data.total } : null;
        }
        case "purchases": {
          const r = await getV4StockPurchaseSummaryAction(brandSlug, filter);
          return r.success ? { rows: r.data.data, total: r.data.total } : null;
        }
        case "units": {
          const r = await getV4UnitSecondSummaryAction(brandSlug, filter);
          return r.success ? { rows: r.data.data, total: r.data.total } : null;
        }
        default:
          return null;
      }
    };

    const result = await fetchRows();
    if (!result) {
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    setRows(result.rows);
    setTotalCount(result.total);

    const totalsFilter = { branchId: filter.branchId, productKind: filter.productKind ?? undefined, status: filter.status ?? undefined };
    const tr = await getV4InventoryReportTotalsAction(brandSlug, totalsFilter);
    if (tr.success) setTotals(tr.data);
    setLoading(false);
  }, [brandSlug, activeTab, filter]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => { setPage(1); }, [activeTab, branchFilter, productKind, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => { if (activeTab !== "valuation" && !MOVEMENT_TYPE_OPTIONS.some((o) => o.value === statusFilter) && !STOCK_STATUS_OPTIONS.some((o) => o.value === statusFilter) && !PURCHASE_STATUS_OPTIONS.some((o) => o.value === statusFilter) && !UNIT_STATUS_OPTIONS.some((o) => o.value === statusFilter)) setStatusFilter(""); }, [activeTab, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r: any) => {
      const haystack = [
        r.productName, r.variantName, r.productNameSnapshot, r.variantNameSnapshot,
        r.sku, r.barcode, r.imei, r.serialNumber, r.purchaseNumber, r.supplierName,
        r.referenceLabel, r.notes, r.categoryName,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportStockReportCSVAction(brandSlug, {
        branchId: filter.branchId,
        productKind: filter.productKind ?? undefined,
        status: filter.status ?? undefined,
        dateFrom: filter.dateFrom ?? undefined,
        dateTo: filter.dateTo ?? undefined,
      });
      if (result.success) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        setError(result.error);
      }
    } catch (e: any) {
      setError(e.message || "Gagal mengexport laporan.");
    } finally {
      setExporting(false);
    }
  }, [brandSlug, filter]);

  const showDateRange = activeTab === "movements" || activeTab === "purchases";

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Laporan Stok"
        breadcrumbs={[
          { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
          { label: "Stok Manajemen", href: `/${brandSlug}/panel/inventory-v4` },
          { label: "Laporan Stok" },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport} disabled={exporting || loading}>
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export CSV
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground -mt-4">
        Ringkasan stok, nilai persediaan, mutasi, pembelian, dan unit second di seluruh cabang.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Varian Stok" value={String(totals?.variantCount ?? 0)} icon={Layers} color="text-muted-foreground" loading={loading && !totals} />
        <KpiCard label="Stok Tersedia" value={String(totals?.totalAvailableStock ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} icon={Boxes} color="text-emerald-600" loading={loading && !totals} />
        <KpiCard label="Nilai Persediaan (HPP)" value={fmtCurrency(totals?.totalCostValue ?? 0)} icon={Wallet} color="text-blue-600" loading={loading && !totals} />
        <KpiCard label="Potensi Laba" value={fmtCurrency(totals?.totalPotentialGrossProfit ?? 0)} icon={TrendingUp} color={Number(totals?.totalPotentialGrossProfit ?? 0) >= 0 ? "text-violet-600" : "text-red-600"} loading={loading && !totals} />
        <KpiCard label="Stok Menipis" value={String(totals?.lowStockCount ?? 0)} icon={AlertTriangle} color="text-amber-600" loading={loading && !totals} />
        <KpiCard label="Stok Habis" value={String(totals?.outOfStockCount ?? 0)} icon={Package} color="text-red-600" loading={loading && !totals} />
        <KpiCard label="Unit Second Ready" value={String(totals?.unitSecondReadyCount ?? 0)} icon={Cpu} color="text-cyan-600" loading={loading && !totals} />
        <KpiCard label="Unit Second Terjual" value={String(totals?.unitSecondSoldCount ?? 0)} icon={ShoppingCart} color="text-rose-600" loading={loading && !totals} />
      </div>

      {/* ── Filter Panel ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_BRANCHES">Semua Cabang</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {useProductKind && (
              <Select value={productKind} onValueChange={setProductKind}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {useStatus && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(activeTab === "movements" ? MOVEMENT_TYPE_OPTIONS : activeTab === "purchases" ? PURCHASE_STATUS_OPTIONS : activeTab === "units" ? UNIT_STATUS_OPTIONS : STOCK_STATUS_OPTIONS).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {showDateRange && (
              <div className="flex items-center gap-1.5">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
                <span className="text-xs text-muted-foreground">—</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
              </div>
            )}

            <div className="relative ml-auto w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk, SKU, IMEI..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="stock">Ringkasan Stok</TabsTrigger>
          <TabsTrigger value="valuation">Nilai Persediaan</TabsTrigger>
          <TabsTrigger value="movements">Mutasi Stok</TabsTrigger>
          <TabsTrigger value="purchases">Riwayat Pembelian</TabsTrigger>
          <TabsTrigger value="units">Unit Second</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Ringkasan Stok</CardTitle>
              <CardDescription className="text-xs">Stok per varian berdasarkan cabang</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Package className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada data stok.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Tersedia</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Min</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredRows as V4InventoryStockSummaryRow[]).map((r) => (
                        <TableRow key={`${r.branchId}-${r.variantId}`}>
                          <TableCell className="font-medium">{r.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{r.variantName}</TableCell>
                          <TableCell className="text-muted-foreground">{r.categoryName ?? "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.availableStock}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{r.reservedStock}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.currentStock}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{r.minStock ?? 0}</TableCell>
                          <TableCell><StockStatusBadge status={r.stockStatus} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {loading ? "Memuat data..." : `Menampilkan ${rangeStart} - ${rangeEnd} dari ${totalCount}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">{safePage}</span>
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Nilai Persediaan</CardTitle>
              <CardDescription className="text-xs">Valuasi stok berdasarkan HPP dan nilai jual potensial</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Wallet className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada data persediaan.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead className="text-right">Stok</TableHead>
                        <TableHead className="text-right">HPP Rata-rata</TableHead>
                        <TableHead className="text-right">Harga Jual</TableHead>
                        <TableHead className="text-right">Nilai Persediaan</TableHead>
                        <TableHead className="text-right">Nilai Jual Potensial</TableHead>
                        <TableHead className="text-right">Potensi Laba</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredRows as V4InventoryValuationRow[]).map((r) => (
                        <TableRow key={`${r.branchId}-${r.variantId}`}>
                          <TableCell className="font-medium">{r.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{r.variantName}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.currentStock}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtCurrency(r.averageCost)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtCurrency(r.sellingPrice)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(r.costValue)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtCurrency(r.potentialSalesValue)}</TableCell>
                          <TableCell className={`text-right tabular-nums ${r.potentialGrossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtCurrency(r.potentialGrossProfit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">Menampilkan {rangeStart} - {rangeEnd} dari {totalCount}</p>
                    <div className="flex items-center gap-2">
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">{safePage}</span>
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Mutasi Stok</CardTitle>
              <CardDescription className="text-xs">Log pergerakan stok dengan detail produk dan arah</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <ArrowRightLeft className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada mutasi stok pada periode ini.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead className="text-center">Arah</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Sebelum</TableHead>
                        <TableHead className="text-right">Sesudah</TableHead>
                        <TableHead>Referensi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredRows as V4InventoryMovementSummaryRow[]).map((r) => (
                        <TableRow key={r.createdAt + r.productName + r.quantity}>
                          <TableCell className="text-muted-foreground">{fmtDateTime(r.createdAt)}</TableCell>
                          <TableCell className="font-medium">{r.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{r.variantName}</TableCell>
                          <TableCell className="text-muted-foreground">{movementTypeLabel(r.movementType)}</TableCell>
                          <TableCell className="text-center">
                            {r.direction === "IN" ? (
                              <ArrowUpRight className="inline size-4 text-emerald-600" />
                            ) : r.direction === "OUT" ? (
                              <ArrowDownRight className="inline size-4 text-red-600" />
                            ) : (
                              <ArrowRightLeft className="inline size-4 text-amber-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{r.stockBefore ?? "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.stockAfter ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{r.referenceLabel ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">Menampilkan {rangeStart} - {rangeEnd} dari {totalCount}</p>
                    <div className="flex items-center gap-2">
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">{safePage}</span>
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Riwayat Pembelian</CardTitle>
              <CardDescription className="text-xs">Detail pembelian stok beserta supplier dan biaya</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <ShoppingCart className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada pembelian pada periode ini.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>No. PO</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">HPP</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredRows as V4StockPurchaseSummaryRow[]).map((r, idx) => (
                        <TableRow key={r.purchaseNumber + idx}>
                          <TableCell className="text-muted-foreground">{fmtDate(r.purchaseDate)}</TableCell>
                          <TableCell className="font-medium tabular-nums">{r.purchaseNumber}</TableCell>
                          <TableCell className="text-muted-foreground">{r.supplierName ?? "-"}</TableCell>
                          <TableCell className="font-medium">{r.productNameSnapshot}</TableCell>
                          <TableCell className="text-muted-foreground">{r.variantNameSnapshot}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtCurrency(r.unitCost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(r.subtotalAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "VOIDED" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {r.status === "COMPLETED" ? "Selesai" : r.status === "VOIDED" ? "Dibatalkan" : "Draft"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">Menampilkan {rangeStart} - {rangeEnd} dari {totalCount}</p>
                    <div className="flex items-center gap-2">
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">{safePage}</span>
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Unit Second</CardTitle>
              <CardDescription className="text-xs">Inventori unit second serial dengan kondisi dan harga</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Cpu className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada unit second.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IMEI / Serial</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Varian</TableHead>
                        <TableHead>Kondisi</TableHead>
                        <TableHead className="text-center">Battery</TableHead>
                        <TableHead className="text-right">Harga Beli</TableHead>
                        <TableHead className="text-right">Harga Jual</TableHead>
                        <TableHead className="text-right">Potensi Laba</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredRows as V4UnitSecondSummaryRow[]).map((r) => (
                        <TableRow key={r.unitId}>
                          <TableCell className="font-medium tabular-nums">{r.imei ?? r.serialNumber ?? "-"}</TableCell>
                          <TableCell>{r.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{r.variantName ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{r.conditionGrade ?? "-"}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.batteryHealth != null ? `${r.batteryHealth}%` : "-"}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtCurrency(r.purchaseCost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(r.sellingPrice)}</TableCell>
                          <TableCell className={`text-right tabular-nums ${r.potentialProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtCurrency(r.potentialProfit)}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px] px-1.5 py-0">{unitStatusLabel(r.status)}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-xs text-muted-foreground">Menampilkan {rangeStart} - {rangeEnd} dari {totalCount}</p>
                    <div className="flex items-center gap-2">
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">{safePage}</span>
                        <Button variant="outline" size="icon" className="size-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
