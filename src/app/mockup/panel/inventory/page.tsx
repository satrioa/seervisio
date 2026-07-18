"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Search, Filter, Package, Boxes, AlertTriangle, AlertCircle,
  DollarSign, Warehouse, Plus, ShoppingCart, ClipboardList,
  ChevronLeft, ChevronRight, Edit, Eye, FileText, Loader2, Smartphone,
  Wrench, ShoppingBag,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  listInventoryItemsAction,
  getInventoryCategoriesAction,
  listInventoryMovementsAction,
  listPurchaseHistoryAction,
  getPurchaseDetailAction,
  type InventoryItemRow,
  type InventoryCategoryRow,
  type InventoryListResult,
  type MovementRow,
  type MovementListResult,
  type PurchaseRow,
  type PurchaseListResult,
  type SerializedUnitRow,
  type SerializedUnitListResult,
  listSerializedUnitsAction,
} from "@/server/actions/inventory.actions";
import { InventoryItemDialog } from "@/components/inventory/inventory-item-dialog";
import { StockTypePickerDialog, type StockSelection } from "@/components/inventory/stock-type-picker-dialog";
import { StockItemFormDialog } from "@/components/inventory/stock-item-form-dialog";
import { UnitSecondFormDialog } from "@/components/inventory/unit-second-form-dialog";
import { PurchaseFormDialog } from "@/components/inventory/purchase-form-dialog";
import { PurchaseDetailDrawer } from "@/components/inventory/purchase-detail-drawer";
import { SerializedUnitFormDialog } from "@/components/inventory/serialized-unit-form-dialog";
import { StockOpnameDialog } from "@/components/inventory/stock-opname-dialog";
import { CategoryManagerDialog } from "@/components/inventory/inventory-category-manager";
import { MOVEMENT_TYPE_LABELS, SERIALIZED_UNIT_STATUS_LABELS, CONDITION_GRADE_LABELS } from "@/types/app";

/* ─── Helpers ─── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function stockStatus(current: number, min: number, active: boolean) {
  if (!active) return { label: "Nonaktif", variant: "outline" as const };
  if (current <= 0) return { label: "Habis", variant: "destructive" as const };
  if (current <= min) return { label: "Menipis", variant: "secondary" as const };
  return { label: "Aman", variant: "default" as const };
}

const TRACKING_TYPE_OPTIONS = [
  { value: "ALL_TRACKING_TYPES", label: "Semua Tracking" },
  { value: "QUANTITY", label: "Quantity" },
  { value: "SERIALIZED", label: "Serialized" },
];

const STOCK_STATUS_OPTIONS = [
  { value: "ALL_STATUS", label: "Semua Status" },
  { value: "SAFE", label: "Aman" },
  { value: "LOW", label: "Menipis" },
  { value: "OUT", label: "Habis" },
  { value: "INACTIVE", label: "Nonaktif" },
];

const MOVEMENT_TYPE_FILTERS = [
  { value: "ALL_TYPES", label: "Semua Tipe" },
  { value: "PURCHASE_IN", label: "Belanja Stok" },
  { value: "ADJUSTMENT_IN", label: "Penyesuaian Masuk" },
  { value: "ADJUSTMENT_OUT", label: "Penyesuaian Keluar" },
  { value: "DAMAGE", label: "Rusak/Hilang" },
  { value: "DAMAGE_OUT", label: "Rusak/Hilang" },
  { value: "TRANSFER_IN", label: "Transfer Masuk" },
  { value: "TRANSFER_OUT", label: "Transfer Keluar" },
];

/* ─── Page ─── */

export default function InventoryPage() {
  const { activeBranchId, branches, userRole } = useActiveBranch();
  const canManage = can(userRole as any, PERMISSIONS.INVENTORY_MANAGE);
  const canViewCost = canManage;
  const brandSlug = useParams().brandSlug as string;
  const isMasterAdmin = userRole === "MASTER_ADMIN" || userRole === "PLATFORM_OWNER";

  /* ── Item list state ── */
  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState<string>("ALL_BRANCHES");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL_CATEGORIES");
  const [trackingFilter, setTrackingFilter] = React.useState<string>("ALL_TRACKING_TYPES");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL_STATUS");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [data, setData] = React.useState<InventoryListResult | null>(null);
  const [categories, setCategories] = React.useState<InventoryCategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("sparepart");
  const [unitSubTab, setUnitSubTab] = React.useState("unit-baru");

  /* ── Dialogs ── */
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<InventoryItemRow | null>(null);
  const [stockOpnameOpen, setStockOpnameOpen] = React.useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);
  const [purchaseFormOpen, setPurchaseFormOpen] = React.useState(false);

  /* ── New stock dialogs ── */
  const [stockPickerOpen, setStockPickerOpen] = React.useState(false);
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [formStockType, setFormStockType] = React.useState<"SPAREPART" | "PRODUCT" | "UNIT_BARU">("PRODUCT");
  const [unitSecondOpen, setUnitSecondOpen] = React.useState(false);

  /* ── Movement tab state ── */
  const [movData, setMovData] = React.useState<MovementListResult | null>(null);
  const [movLoading, setMovLoading] = React.useState(false);
  const [movTypeFilter, setMovTypeFilter] = React.useState("ALL_TYPES");
  const [movSearch, setMovSearch] = React.useState("");
  const [movPage, setMovPage] = React.useState(1);

  /* ── Purchase history state ── */
  const [purchData, setPurchData] = React.useState<PurchaseListResult | null>(null);
  const [purchLoading, setPurchLoading] = React.useState(false);
  const [purchSearch, setPurchSearch] = React.useState("");
  const [purchPage, setPurchPage] = React.useState(1);
  const [purchDateFrom, setPurchDateFrom] = React.useState("");
  const [purchDateTo, setPurchDateTo] = React.useState("");
  const [detailPurchaseId, setDetailPurchaseId] = React.useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = React.useState(false);

  /* ── Serialized unit state ── */
  const [suData, setSuData] = React.useState<SerializedUnitListResult | null>(null);
  const [suLoading, setSuLoading] = React.useState(false);
  const [suSearch, setSuSearch] = React.useState("");
  const [suBranchFilter, setSuBranchFilter] = React.useState<string>("ALL_BRANCHES");
  const [suStatusFilter, setSuStatusFilter] = React.useState<string>("ALL_STATUS");
  const [suPage, setSuPage] = React.useState(1);
  const [suFormOpen, setSuFormOpen] = React.useState(false);
  const [editSerializedUnit, setEditSerializedUnit] = React.useState<SerializedUnitRow | null>(null);

  /* ── Data fetching ── */

  // Fetch categories once
  React.useEffect(() => {
    getInventoryCategoriesAction(brandSlug).then((res) => {
      if (res.success) setCategories(res.data);
    });
  }, []);

  // Filter by active tab
  const isUnitSecondTab = activeTab === "unit-second" || (activeTab === "unit" && unitSubTab === "unit-second");
  const isUnitBaruTab = activeTab === "unit" && unitSubTab === "unit-baru";
  const stockTypeFilter = activeTab === "sparepart" ? "SPAREPART" : activeTab === "produk" ? "PRODUCT" : (isUnitBaruTab ? "UNIT" : undefined);

  // Fetch items
  React.useEffect(() => {
    setPage(1);
  }, [search, branchFilter, categoryFilter, trackingFilter, statusFilter, activeTab, unitSubTab]);

  React.useEffect(() => {
    if (isUnitSecondTab) return;
    setLoading(true);
    listInventoryItemsAction(brandSlug, {
      branchId: branchFilter === "ALL_BRANCHES" ? activeBranchId : branchFilter,
      categoryId: categoryFilter,
      stockType: stockTypeFilter,
      trackingType: trackingFilter,
      stockStatus: statusFilter,
      search: search || null,
      page,
      pageSize,
      mode: "grouped",
    }).then((res) => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, [branchFilter, categoryFilter, stockTypeFilter, trackingFilter, statusFilter, search, page, pageSize, activeBranchId, refreshKey, isUnitSecondTab]);

  // Fetch movements
  const fetchMovements = React.useCallback(() => {
    setMovLoading(true);
    listInventoryMovementsAction(brandSlug, {
      branchId: branchFilter === "ALL_BRANCHES" ? activeBranchId : branchFilter,
      movementType: movTypeFilter,
      search: movSearch || null,
      page: movPage,
      pageSize: 10,
    }).then((res) => {
      if (res.success) setMovData(res.data);
      setMovLoading(false);
    });
  }, [branchFilter, activeBranchId, movTypeFilter, movSearch, movPage]);

  React.useEffect(() => {
    if (activeTab === "movement") fetchMovements();
  }, [activeTab, fetchMovements]);

  // Fetch purchase history
  const fetchPurchases = React.useCallback(() => {
    if (!canManage) return;
    setPurchLoading(true);
    listPurchaseHistoryAction(brandSlug, {
      branchId: branchFilter === "ALL_BRANCHES" ? activeBranchId : branchFilter,
      search: purchSearch || null,
      dateFrom: purchDateFrom || undefined,
      dateTo: purchDateTo || undefined,
      page: purchPage,
      pageSize: 10,
    }).then((res) => {
      if (res.success) setPurchData(res.data);
      setPurchLoading(false);
    });
  }, [branchFilter, activeBranchId, purchSearch, purchPage, purchDateFrom, purchDateTo, canManage]);

  React.useEffect(() => {
    if (activeTab === "purchase") fetchPurchases();
  }, [activeTab, fetchPurchases]);

  // Fetch serialized units
  const fetchSerializedUnits = React.useCallback(() => {
    setSuLoading(true);
    listSerializedUnitsAction(brandSlug, {
      branchId: suBranchFilter,
      status: suStatusFilter,
      search: suSearch || null,
      page: suPage,
      pageSize: 10,
    }).then((res) => {
      if (res.success) setSuData(res.data);
      setSuLoading(false);
    });
  }, [suBranchFilter, suStatusFilter, suSearch, suPage]);

  React.useEffect(() => {
    if (activeTab === "unit-second" || (activeTab === "unit" && unitSubTab === "unit-second")) fetchSerializedUnits();
  }, [activeTab, unitSubTab, fetchSerializedUnits]);

  /* ── KPIs (from items data, contextual per tab) ── */
  const tabLabel = activeTab === "sparepart" ? "Sparepart" : activeTab === "produk" ? "Produk" : unitSubTab === "unit-baru" ? "Unit Baru" : "Unit Second";
  const totalItems = data?.items.length ?? 0;
  const totalStock = data?.items.reduce((sum, i) => sum + i.currentStock, 0) ?? 0;
  const lowCount = data?.items.filter((i) => i.currentStock > 0 && i.currentStock <= i.minStock).length ?? 0;
  const outCount = data?.items.filter((i) => i.currentStock <= 0 && i.isActive).length ?? 0;
  const totalValue = data?.items.reduce((sum, i) => sum + i.currentStock * i.costPrice, 0) ?? 0;

  /* ── Handlers ── */
  const openEdit = (item: InventoryItemRow) => {
    setEditItem(item);
    setItemDialogOpen(true);
  };

  const openCreate = () => {
    setStockPickerOpen(true);
  };

  const handleStockTypeSelect = (selection: StockSelection) => {
    setStockPickerOpen(false);
    if (selection === "UNIT_SECOND") {
      setUnitSecondOpen(true);
    } else {
      setFormStockType(selection);
      setFormDialogOpen(true);
    }
  };

  const openDetail = async (purchaseId: string) => {
    setDetailPurchaseId(purchaseId);
    setDetailDrawerOpen(true);
  };

  const handleRefreshItemTab = React.useCallback(() => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  }, []);
  const handleRefreshMovements = () => { setMovPage(1); fetchMovements(); };
  const handleRefreshPurchases = () => { setPurchPage(1); fetchPurchases(); };

  /* ── Shared stock section ── */
  const renderStockSection = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Item" value={loading ? "..." : String(totalItems)} icon={Package} helper="semua item aktif" />
        <SummaryCard label="Total Stok" value={loading ? "..." : String(totalStock)} icon={Boxes} helper="semua cabang" />
        <SummaryCard label="Stok Menipis" value={loading ? "..." : String(lowCount)} icon={AlertCircle} helper="≤ min. stok" />
        <SummaryCard label="Stok Habis" value={loading ? "..." : String(outCount)} icon={AlertTriangle} helper="perlu restock" />
        <SummaryCard label="Nilai Inventory" value={loading ? "..." : canViewCost ? formatRp(totalValue) : "—"} icon={DollarSign} helper="harga modal × stok" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Cari nama, SKU, barcode..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-xs" />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><Filter className="size-3" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_BRANCHES" className="text-xs">Semua Cabang</SelectItem>
            {branches.map((b) => (<SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_CATEGORIES" className="text-xs">Semua Kategori</SelectItem>
            {categories.map((c) => (<SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={trackingFilter} onValueChange={setTrackingFilter}>
          <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue placeholder="Tracking" /></SelectTrigger>
          <SelectContent>{TRACKING_TYPE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[100px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{STOCK_STATUS_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>))}</SelectContent>
        </Select>
        {canManage && (
          <>
            <Button size="sm" className="h-9 text-xs" onClick={openCreate}><Plus className="mr-1.5 size-3.5" /> Tambah Item</Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => { setStockOpnameOpen(true); }}>
              <ClipboardList className="mr-1.5 size-3.5" /> Penyesuaian Stok
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => { setPurchaseFormOpen(true); }}>
              <ShoppingCart className="mr-1.5 size-3.5" /> Belanja Stok
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setCategoryManagerOpen(true)}>
          Kelola Kategori
        </Button>
      </div>

      {/* Item Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[2fr_80px_100px_100px_70px_70px_80px_100px_80px_40px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Item</span><span>Tipe</span><span>SKU / Barcode</span><span>Varian</span>
          <span>Stok</span><span>Min.</span>
          <span className={canViewCost ? "" : "text-muted-foreground/30"}>Harga Modal</span>
          <span>Harga Jual</span><span>Status</span><span />
        </div>
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_80px_100px_100px_70px_70px_80px_100px_80px_40px] gap-2 border-b px-3 py-3 last:border-0">
            {Array.from({ length: 10 }).map((_, j) => (<Skeleton key={j} className="h-4 w-full" />))}
          </div>
        )            ) : data && data.items.length > 0 ? data.items.map((item) => {
          const isParent = item.isVariantParent;
          const ss = !isParent ? stockStatus(item.currentStock, item.minStock, item.isActive) : null;
          return (
            <div key={item.id} className="grid grid-cols-[2fr_80px_100px_100px_70px_70px_80px_100px_80px_40px] gap-2 border-b px-3 py-2.5 text-xs transition-colors last:border-0 hover:bg-muted/20">
              <div className="flex min-w-0 items-center gap-2">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${isParent ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"}`}>
                  {isParent ? <Boxes className="size-3.5 text-amber-600 dark:text-amber-400" /> : <Package className="size-3.5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    {isParent ? "Grup varian" : (item.branchName ?? "—")}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {isParent ? (
                  <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-normal">Varian</Badge>
                ) : (
                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">{item.itemType}</Badge>
                )}
              </div>
              <div className="flex flex-col items-start justify-center text-[10px] text-muted-foreground">
                {isParent ? (
                  <span className="text-[9px] text-muted-foreground/50">—</span>
                ) : (
                  <>
                    {item.sku && <span className="truncate">{item.sku}</span>}
                    {item.barcode && <span className="truncate font-mono">{item.barcode}</span>}
                    {!item.sku && !item.barcode && <span className="text-[9px] text-muted-foreground/50">—</span>}
                  </>
                )}
              </div>
              <div className="flex items-center text-[10px] text-muted-foreground">
                {item.variantName || (Object.keys(item.variantAttributes).length > 0
                  ? Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(", ") : isParent ? "Multi varian" : "—")}
              </div>
              <div className="flex items-center tabular-nums text-foreground">
                {isParent ? (
                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">Multi</Badge>
                ) : (
                  <>{item.currentStock} {item.unitName}</>
                )}
              </div>
              <div className="flex items-center text-[10px] text-muted-foreground">
                {isParent ? "—" : item.minStock}
              </div>
              <div className={`flex items-center text-[10px] tabular-nums ${canViewCost ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                {isParent ? "—" : (canViewCost ? formatRp(item.costPrice) : "—")}
              </div>
              <div className="flex items-center text-[10px] tabular-nums text-foreground">
                {isParent ? "—" : formatRp(item.sellingPrice)}
              </div>
              <div className="flex items-center">
                {isParent ? (
                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">Grup</Badge>
                ) : (
                  <Badge variant={ss!.variant} className="h-5 rounded-full px-2 text-[10px] font-normal">{ss!.label}</Badge>
                )}
              </div>
              <div className="flex items-center justify-center">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(item)} disabled={!canManage}><Edit className="size-3.5" /></Button>
              </div>
            </div>
          );
        }) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center"><Package className="mx-auto size-8 text-muted-foreground/30" />
              <p className="mt-2 text-xs text-muted-foreground">Tidak ada item ditemukan</p>
              {search && (<Button variant="link" size="sm" className="h-6 text-[10px]" onClick={() => setSearch("")}>Hapus pencarian</Button>)}
            </div>
          </div>
        )}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t bg-card px-3 py-2.5">
            <span className="text-[10px] text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[72px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent align="end">{[10, 20, 50].map((s) => (<SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>))}</SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={page === 1}><ChevronLeft className="size-4" /></Button>
            <Button size="sm" className="h-8 min-w-8 rounded-lg px-2 text-xs">{page}</Button>
            <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPage((c) => Math.min(data.totalPages, c + 1))} disabled={page === data.totalPages}><ChevronRight className="size-4" /></Button>
          </div>
        )}
      </div>
    </>
  );

  const renderSerializedSection = () => (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari IMEI/serial/barcode..."
            value={suSearch}
            onChange={(e) => { setSuSearch(e.target.value); setSuPage(1); }}
            className="h-9 w-full max-w-xs pl-8 text-xs"
          />
        </div>
        <Select value={suBranchFilter} onValueChange={(v) => { setSuBranchFilter(v); setSuPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_BRANCHES" className="text-xs">Semua Cabang</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={suStatusFilter} onValueChange={(v) => { setSuStatusFilter(v); setSuPage(1); }}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_STATUS" className="text-xs">Semua Status</SelectItem>
            {Object.entries(SERIALIZED_UNIT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && (
          <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setUnitSecondOpen(true)}>
            <Plus className="size-3.5" /> Tambah Batch Unit
          </Button>
        )}
      </div>

      {suLoading && !suData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : suData && suData.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5">IMEI / Serial</th>
                <th className="px-3 py-2.5">Barcode</th>
                <th className="px-3 py-2.5">Varian</th>
                <th className="px-3 py-2.5">BH</th>
                <th className="px-3 py-2.5">Kondisi</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Cabang</th>
                {canManage && <th className="px-3 py-2.5 text-right">Harga Jual</th>}
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suData.items.map((unit) => (
                <tr key={unit.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{unit.itemName ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{unit.itemSku ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <p>{unit.imei ?? "—"}</p>
                    <p className="text-[10px]">{unit.serialNumber ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{unit.barcode ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{unit.itemVariantName ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{unit.batteryHealth != null ? `${unit.batteryHealth}%` : "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {unit.conditionGrade ? (CONDITION_GRADE_LABELS[unit.conditionGrade] ?? unit.conditionGrade) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={unit.status === "READY_STOCK" ? "default" : unit.status === "SOLD" || unit.status === "ARCHIVED" ? "outline" : "secondary"} className="text-[10px]">
                      {SERIALIZED_UNIT_STATUS_LABELS[unit.status] ?? unit.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{unit.branchName ?? "—"}</td>
                  {canManage && (
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                      {unit.sellingPrice != null ? `Rp ${unit.sellingPrice.toLocaleString("id-ID")}` : "—"}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setEditSerializedUnit(unit); setSuFormOpen(true); }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {suData && suData.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t bg-card px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground">Page {suPage}/{suData.totalPages}</span>
              <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setSuPage((c) => Math.max(1, c - 1))} disabled={suPage === 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setSuPage((c) => Math.min(suData.totalPages, c + 1))} disabled={suPage === suData.totalPages}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Smartphone className="mx-auto size-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">Belum ada unit second.</p>
            {canManage && (
              <Button variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={() => { setEditSerializedUnit(null); setSuFormOpen(true); }}>
                <Plus className="mr-1 size-3" /> Tambah Unit
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {!isMasterAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Anda sedang membuka versi legacy.</p>
          <p className="mt-0.5">Data di halaman ini tidak bercampur dengan Inventory V4. Gunakan halaman Inventory dari sidebar untuk versi terbaru.</p>
        </div>
      )}
      {isMasterAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Mode Legacy — Hanya Admin</p>
          <p className="mt-0.5">Anda sedang membuka versi legacy. Data di halaman ini tidak bercampur dengan Inventory/POS V4. Gunakan halaman Inventory/POS dari sidebar untuk versi terbaru.</p>
        </div>
      )}
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Stok Manajemen</h1>
        <p className="text-xs text-muted-foreground">
          Kelola stok sparepart, aksesoris, unit second, dan material servis.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setUnitSubTab("unit-baru"); }}>
        <TabsList className="h-auto gap-0 border-b bg-transparent p-0">
          <TabsTrigger value="sparepart" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Wrench className="mr-1.5 size-3.5" /> Sparepart
          </TabsTrigger>
          <TabsTrigger value="produk" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <ShoppingBag className="mr-1.5 size-3.5" /> Produk
          </TabsTrigger>
          <TabsTrigger value="unit" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Smartphone className="mr-1.5 size-3.5" /> Unit
          </TabsTrigger>
          <TabsTrigger value="movement" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Warehouse className="mr-1.5 size-3.5" /> Movement Stok
          </TabsTrigger>
          <TabsTrigger value="purchase" disabled={!canManage} className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <ShoppingCart className="mr-1.5 size-3.5" /> Riwayat Belanja
          </TabsTrigger>
        </TabsList>

        {/* ══════ SPAREPART TAB ══════ */}
        <TabsContent value="sparepart" className="mt-4 space-y-4">
          {renderStockSection()}
        </TabsContent>

        {/* ══════ PRODUK TAB ══════ */}
        <TabsContent value="produk" className="mt-4 space-y-4">
          {renderStockSection()}
        </TabsContent>

        {/* ══════ UNIT TAB ══════ */}
        <TabsContent value="unit" className="mt-4 space-y-4">
          <Tabs value={unitSubTab} onValueChange={(v) => setUnitSubTab(v)}>
            <TabsList className="h-auto gap-0 border-b bg-transparent p-0">
              <TabsTrigger value="unit-baru" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
                Unit Baru
              </TabsTrigger>
              <TabsTrigger value="unit-second" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
                Unit Second
              </TabsTrigger>
            </TabsList>
            <TabsContent value="unit-baru" className="mt-4 space-y-4">
              {renderStockSection()}
            </TabsContent>
            <TabsContent value="unit-second" className="mt-4">
              {renderSerializedSection()}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ══════ MOVEMENT STOK TAB ══════ */}
        <TabsContent value="movement" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input type="text" placeholder="Cari item..." value={movSearch}
                onChange={(e) => { setMovSearch(e.target.value); setMovPage(1); }} className="h-9 pl-8 text-xs" />
            </div>
            <Select value={movTypeFilter} onValueChange={(v) => { setMovTypeFilter(v); setMovPage(1); }}>
              <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Tipe Movement" /></SelectTrigger>
              <SelectContent>{MOVEMENT_TYPE_FILTERS.map((o) => (<SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>))}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={handleRefreshMovements}><ClipboardList className="mr-1.5 size-3.5" /> Refresh</Button>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-[120px_1fr_80px_60px_60px_60px_150px_100px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Tanggal</span><span>Item</span><span>Tipe</span><span>Masuk</span><span>Keluar</span><span>Stok</span><span>Referensi</span><span>User</span>
            </div>
            {movLoading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_80px_60px_60px_60px_150px_100px] gap-2 border-b px-3 py-3 last:border-0">
                {Array.from({ length: 8 }).map((_, j) => (<Skeleton key={j} className="h-4 w-full" />))}
              </div>
            )) : movData && movData.items.length > 0 ? movData.items.map((mov) => (
              <div key={mov.id} className="grid grid-cols-[120px_1fr_80px_60px_60px_60px_150px_100px] gap-2 border-b px-3 py-2 text-xs transition-colors last:border-0 hover:bg-muted/20">
                <div className="flex items-center text-[10px] text-muted-foreground">
                  {new Date(mov.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex min-w-0 items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{mov.itemName ?? "—"}</p>
                    <p className="truncate text-[9px] text-muted-foreground">{mov.itemSku || mov.itemBarcode || mov.branchName || ""}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">{mov.movementTypeLabel}</Badge>
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {mov.direction === "IN" ? `${mov.quantity}` : "—"}
                </div>
                <div className="flex items-center text-destructive tabular-nums">
                  {mov.direction === "OUT" ? `${mov.quantity}` : "—"}
                </div>
                <div className="flex items-center text-[10px] tabular-nums text-muted-foreground">
                  {mov.stockBefore} → {mov.stockAfter}
                </div>
                <div className="flex items-center text-[10px] text-muted-foreground truncate">
                  {mov.referenceLabel || mov.notes || "—"}
                </div>
                <div className="flex items-center text-[10px] text-muted-foreground truncate">
                  {mov.createdByName || "—"}
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center"><Warehouse className="mx-auto size-8 text-muted-foreground/30" />
                  <p className="mt-2 text-xs text-muted-foreground">Belum ada movement stok.</p>
                </div>
              </div>
            )}
            {movData && movData.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t bg-card px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground">Page {movPage}/{movData.totalPages}</span>
                <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setMovPage((c) => Math.max(1, c - 1))} disabled={movPage === 1}><ChevronLeft className="size-4" /></Button>
                <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setMovPage((c) => Math.min(movData.totalPages, c + 1))} disabled={movPage === movData.totalPages}><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════ RIWAYAT BELANJA TAB ══════ */}
        <TabsContent value="purchase" className="mt-4 space-y-4">
          {canManage && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="text" placeholder="Cari nomor PO atau supplier..." value={purchSearch}
                    onChange={(e) => { setPurchSearch(e.target.value); setPurchPage(1); }} className="h-9 pl-8 text-xs" />
                </div>
                <Input type="date" value={purchDateFrom} onChange={(e) => { setPurchDateFrom(e.target.value); setPurchPage(1); }} className="h-9 w-[140px] text-xs" />
                <Input type="date" value={purchDateTo} onChange={(e) => { setPurchDateTo(e.target.value); setPurchPage(1); }} className="h-9 w-[140px] text-xs" />
                <Button size="sm" className="h-9 text-xs" onClick={() => setPurchaseFormOpen(true)}><Plus className="mr-1.5 size-3.5" /> Belanja Stok Baru</Button>
              </div>

              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="grid grid-cols-[100px_1fr_100px_60px_100px_120px_80px_60px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Tanggal</span><span>Nomor</span><span>Supplier</span><span>Item</span><span>Total</span><span>Akun</span><span>Status</span><span />
                </div>
                {purchLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[100px_1fr_100px_60px_100px_120px_80px_60px] gap-2 border-b px-3 py-3 last:border-0">
                    {Array.from({ length: 8 }).map((_, j) => (<Skeleton key={j} className="h-4 w-full" />))}
                  </div>
                )) : purchData && purchData.items.length > 0 ? purchData.items.map((p) => (
                  <div key={p.id} className="grid grid-cols-[100px_1fr_100px_60px_100px_120px_80px_60px] gap-2 border-b px-3 py-2 text-xs transition-colors last:border-0 hover:bg-muted/20">
                    <div className="flex items-center text-[10px] text-muted-foreground">
                      {new Date(p.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="flex min-w-0 items-center">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{p.purchaseNumber}</p>
                        <p className="truncate text-[9px] text-muted-foreground">{p.branchName}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-[10px] text-muted-foreground truncate">{p.supplierName || "—"}</div>
                    <div className="flex items-center text-[10px] tabular-nums text-muted-foreground">{p.items?.length ?? "—"}</div>
                    <div className="flex items-center text-[10px] tabular-nums font-medium text-foreground">{formatRp(p.totalAmount)}</div>
                    <div className="flex items-center text-[10px] text-muted-foreground truncate">{p.paymentAccountName || "—"}</div>
                    <div className="flex items-center"><Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">{p.status}</Badge></div>
                    <div className="flex items-center justify-center">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openDetail(p.id)}><Eye className="size-3.5" /></Button>
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center"><ShoppingCart className="mx-auto size-8 text-muted-foreground/30" />
                      <p className="mt-2 text-xs text-muted-foreground">Belum ada riwayat belanja.</p>
                    </div>
                  </div>
                )}
                {purchData && purchData.totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 border-t bg-card px-3 py-2.5">
                    <span className="text-[10px] text-muted-foreground">Page {purchPage}/{purchData.totalPages}</span>
                    <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPurchPage((c) => Math.max(1, c - 1))} disabled={purchPage === 1}><ChevronLeft className="size-4" /></Button>
                    <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPurchPage((c) => Math.min(purchData.totalPages, c + 1))} disabled={purchPage === purchData.totalPages}><ChevronRight className="size-4" /></Button>
                  </div>
                )}
              </div>
            </>
          )}
          {!canManage && (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-muted-foreground">Anda tidak memiliki akses ke riwayat belanja.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InventoryItemDialog
        open={itemDialogOpen}
        onOpenChange={() => { setItemDialogOpen(false); setEditItem(null); }}
        onSuccess={handleRefreshItemTab}
        item={editItem}
        categories={categories}
        branches={branches}
        activeBranchId={activeBranchId ?? undefined}
      />
      <StockOpnameDialog
        open={stockOpnameOpen}
        onOpenChange={setStockOpnameOpen}
        brandSlug={brandSlug}
        role={userRole ?? undefined}
      />
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        brandSlug={brandSlug}
        role={userRole ?? undefined}
      />
      <PurchaseFormDialog
        open={purchaseFormOpen}
        onOpenChange={() => { setPurchaseFormOpen(false); handleRefreshPurchases(); }}
        onSuccess={() => {
          handleRefreshItemTab();
          handleRefreshMovements();
          handleRefreshPurchases();
        }}
      />
      <PurchaseDetailDrawer
        purchaseId={detailPurchaseId}
        open={detailDrawerOpen}
        onOpenChange={(v: boolean) => { setDetailDrawerOpen(v); if (!v) setDetailPurchaseId(null); }}
      />
      <SerializedUnitFormDialog
        open={suFormOpen}
        onOpenChange={() => { setSuFormOpen(false); setEditSerializedUnit(null); fetchSerializedUnits(); }}
        onSuccess={fetchSerializedUnits}
        unit={editSerializedUnit}
      />
      <StockTypePickerDialog
        open={stockPickerOpen}
        onOpenChange={setStockPickerOpen}
        onSelect={handleStockTypeSelect}
      />
      <StockItemFormDialog
        open={formDialogOpen}
        onOpenChange={() => setFormDialogOpen(false)}
        stockType={formStockType}
        brandSlug={brandSlug}
      />
      <UnitSecondFormDialog
        open={unitSecondOpen}
        onOpenChange={setUnitSecondOpen}
        brandSlug={brandSlug}
      />
    </div>
  );
}
