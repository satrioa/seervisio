"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Search, Plus, Loader2, ChevronLeft, ChevronRight,
  Wrench, ShoppingBag, Smartphone, Package, Cpu, Boxes,
  Tags, Settings2, Pen, Check, X, Trash2,
  ShoppingCart, CreditCard, Receipt, Eye, XCircle,
  ClipboardList, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ExpandableScreen, ExpandableScreenTrigger, ExpandableScreenContent, useExpandableScreen,
} from "@/components/ui/expandable-screen";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { ServiceSparepartUsageV4Section } from "@/components/inventory-v4/service-sparepart-usage-v4-section";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

import {
  listProductsV4Action,
  deactivateProductV4Action,
  reactivateProductV4Action,
  deactivateVariantV4Action,
  reactivateVariantV4Action,
  archiveUnitSecondV4Action,
  reactivateUnitSecondV4Action,
  updateProductV4Action,
  updateVariantV4Action,
  updateUnitSecondV4Action,
  getProductDetailV4Action,
  createSparepartV4Action,
  createProductV4Action,
  createUnitBaruV4Action,
  createUnitSecondV4Action,
  createVariantV4Action,
  searchUnitSecondModelsV4Action,
  listUnitSecondV4Action,
  listCategoriesV4Action,
  createCategoryV4Action,
  updateCategoryV4Action,
  listInventoryMovementsV4Action,
  searchPurchaseVariantsV4Action,
  createStockPurchaseV4Action,
  listStockPurchasesV4Action,
  getStockPurchaseDetailV4Action,
  listStockOpnameVariantsV4Action,
  submitStockOpnameV4Action,
} from "@/server/actions/inventory-v4.actions";
import type {
  ProductV4Row,
  ProductDetailV4Row,
  VariantV4Row,
  UnitSecondV4Row,
  InventoryMovementV4Row,
  CategoryV4Row,
  CreateVariantInput,
  CreateUnitSecondRowInput,
  PurchaseVariantSearchRow,
  StockPurchaseV4Row,
  StockPurchaseItemV4Row,
  CreateStockPurchaseV4Input,
  PurchaseStockV4ItemInput,
  StockOpnameVariantRow,
  StockOpnameAdjustmentInput,
  UpdateProductV4Input,
  UpdateVariantV4Input,
  CreateVariantV4Input,
  UpdateUnitSecondV4Input,
} from "@/server/domain/inventory-v4.types";
import { ConfirmActionDialog } from "@/components/inventory-v4/confirm-action-dialog";
import { productKindLabel, unitStatusLabel, formatVariantAttributes, movementDirectionLabel, movementTypeLabel } from "@/server/domain/inventory-v4.mapper";

const MAX_PAGE = 25;

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type TabType = "sparepart" | "produk" | "unit-baru" | "unit-second" | "movement";

const ITEM_TYPE_MAP: Record<string, string> = {
  sparepart: "SPAREPART",
  produk: "PRODUCT",
  "unit-baru": "DEVICE_UNIT",
  "unit-second": "DEVICE_UNIT",
};

export default function InventoryV4Page() {
  const { activeBranchId, branches, userRole, activeBranchName } = useActiveBranch();
  const canManage = can(userRole as any, PERMISSIONS.INVENTORY_MANAGE);
  const brandSlug = useParams().brandSlug as string;

  const [activeTab, setActiveTab] = React.useState<TabType>("sparepart");

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [formKind, setFormKind] = React.useState<"SPAREPART" | "PRODUCT" | "UNIT_BARU" | "UNIT_SECOND" | null>(null);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<{ data: ProductV4Row[]; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const [usSearch, setUsSearch] = React.useState("");
  const [usPage, setUsPage] = React.useState(1);
  const [usData, setUsData] = React.useState<{ data: UnitSecondV4Row[]; total: number } | null>(null);
  const [usLoading, setUsLoading] = React.useState(false);
  const [usStatusFilter, setUsStatusFilter] = React.useState<string>("ALL");

  const [catManagerOpen, setCatManagerOpen] = React.useState(false);
  const [opnameOpen, setOpnameOpen] = React.useState(false);
  const [serviceSpUsageOpen, setServiceSpUsageOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryV4Row[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const branchMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const itemType = ITEM_TYPE_MAP[activeTab] ?? null;

  const fetchProducts = React.useCallback(() => {
    if (activeTab === "movement") return;
    const productKind = activeTab === "sparepart" ? "SPAREPART" as const
      : activeTab === "produk" ? "PRODUCT" as const
      : "UNIT" as const;
    const conditionType = activeTab === "unit-baru" ? "NEW" as const : null;

    setLoading(true);
    const isActiveParam = statusFilter === "ALL" ? null : statusFilter === "ACTIVE" ? true : false;
    listProductsV4Action(brandSlug, {
      branchId: activeBranchId,
      productKind,
      conditionType,
      search: search || undefined,
      isActive: isActiveParam,
      page,
      pageSize: MAX_PAGE,
    }).then((res) => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, [activeTab, search, page, activeBranchId, brandSlug, statusFilter]);

  React.useEffect(() => {
    if (activeTab !== "unit-second" && activeTab !== "movement") fetchProducts();
  }, [activeTab, fetchProducts, refreshKey]);

  React.useEffect(() => { setPage(1); }, [search, activeTab]);

  React.useEffect(() => {
    if (activeTab !== "unit-second") return;
    setUsLoading(true);
    listUnitSecondV4Action(brandSlug, {
      branchId: activeBranchId,
      status: usStatusFilter === "ALL" ? null : usStatusFilter as any,
      search: usSearch || undefined,
      page: usPage,
      pageSize: MAX_PAGE,
    }).then((res) => {
      if (res.success) setUsData(res.data);
      setUsLoading(false);
    });
  }, [activeTab, usSearch, usPage, usStatusFilter, activeBranchId, brandSlug, refreshKey]);

  React.useEffect(() => { setUsPage(1); }, [usSearch, usStatusFilter]);

  const fetchCategories = React.useCallback(async () => {
    if (!itemType) return;
    const res = await listCategoriesV4Action(brandSlug, itemType);
    if (res.success) setCategories(res.data ?? []);
  }, [brandSlug, itemType]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handlePickerSelect = (kind: "SPAREPART" | "PRODUCT" | "UNIT_BARU" | "UNIT_SECOND") => {
    setPickerOpen(false);
    setFormKind(kind);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / MAX_PAGE)) : 1;
  const usTotalPages = usData ? Math.max(1, Math.ceil(usData.total / MAX_PAGE)) : 1;

  return (
    <ExpandableScreen>
      <div className="flex min-h-full flex-col gap-4 rounded-[14px] bg-card p-4 text-card-foreground sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Inventory</h1>
          <p className="text-xs text-muted-foreground">Stok dipisah berdasarkan Sparepart, Produk, dan Unit.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <ExpandableScreenTrigger>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <ShoppingCart className="size-3.5" /> Belanja Stok
              </Button>
            </ExpandableScreenTrigger>
          )}
          {canManage && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setOpnameOpen(true)}>
              <ClipboardList className="size-3.5" /> Penyesuaian Stok
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setServiceSpUsageOpen(true)}>
              <Wrench className="size-3.5" /> Pakai Sparepart
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setCatManagerOpen(true)}>
              <Tags className="size-3.5" /> Kategori
            </Button>
          )}
          {canManage && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setPickerOpen(true)}>
              <Plus className="size-3.5" /> Tambah Stok
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabType); setPage(1); }}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sparepart" className="text-xs">Sparepart</TabsTrigger>
          <TabsTrigger value="produk" className="text-xs">Produk</TabsTrigger>
          <TabsTrigger value="unit-baru" className="text-xs">Unit Baru</TabsTrigger>
          <TabsTrigger value="unit-second" className="text-xs">Unit Second</TabsTrigger>
          <TabsTrigger value="movement" className="text-xs">Movement</TabsTrigger>
          <TabsTrigger value="riwayat-belanja" className="text-xs">Riwayat Belanja</TabsTrigger>
        </TabsList>

        {(["sparepart", "produk", "unit-baru"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <ProductTabContent
              search={search}
              onSearchChange={setSearch}
              loading={loading}
              data={data?.data ?? null}
              total={data?.total ?? 0}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              canManage={canManage}
              branchMap={branchMap}
              categories={categories}
              brandSlug={brandSlug}
              statusFilter={statusFilter}
              onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
              refresh={refresh}
            />
          </TabsContent>
        ))}

        <TabsContent value="unit-second">
          <UnitSecondTab
            usSearch={usSearch}
            setUsSearch={setUsSearch}
            usStatusFilter={usStatusFilter}
            setUsStatusFilter={setUsStatusFilter}
            usLoading={usLoading}
            usData={usData}
            usPage={usPage}
            usTotalPages={usTotalPages}
            setUsPage={setUsPage}
            branchMap={branchMap}
            brandSlug={brandSlug}
            canManage={canManage}
            refresh={refresh}
          />
        </TabsContent>

        <TabsContent value="movement">
          <MovementTab brandSlug={brandSlug} activeBranchId={activeBranchId} refreshKey={refreshKey} branchMap={branchMap} />
        </TabsContent>

        <TabsContent value="riwayat-belanja">
          <PurchaseHistoryTab brandSlug={brandSlug} activeBranchId={activeBranchId} refreshKey={refreshKey} branchMap={branchMap} />
        </TabsContent>
      </Tabs>

      <TypePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handlePickerSelect} />

      {formKind && formKind !== "UNIT_SECOND" && (
        <QuantityFormDialog
          open={true}
          onOpenChange={() => setFormKind(null)}
          formKind={formKind}
          brandSlug={brandSlug}
          branchId={activeBranchId ?? ""}
          onSuccess={refresh}
          categories={categories}
        />
      )}

      {formKind === "UNIT_SECOND" && (
        <UnitSecondFormDialog
          open={true}
          onOpenChange={() => setFormKind(null)}
          brandSlug={brandSlug}
          branchId={activeBranchId ?? ""}
          onSuccess={refresh}
          categories={categories}
        />
      )}

      <StockOpnameDialog
        open={opnameOpen}
        onOpenChange={setOpnameOpen}
        brandSlug={brandSlug}
        branchId={activeBranchId ?? ""}
        onSuccess={refresh}
        categories={categories}
      />

      <BelanjaStokDialog
        brandSlug={brandSlug}
        branchId={activeBranchId ?? ""}
        onSuccess={refresh}
      />

      <CategoryManagerDialog
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        brandSlug={brandSlug}
        itemType={itemType ?? "SPAREPART"}
        onSuccess={refresh}
      />

      <ServiceSparepartUsageV4Section
        brandSlug={brandSlug}
        open={serviceSpUsageOpen}
        onOpenChange={setServiceSpUsageOpen}
        onSuccess={refresh}
      />
      </div>
    </ExpandableScreen>
  );
}

/* ═══════════════════════ TYPE PICKER ═══════════════════════ */

function TypePickerDialog({
  open, onOpenChange, onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (kind: "SPAREPART" | "PRODUCT" | "UNIT_BARU" | "UNIT_SECOND") => void;
}) {
  const [step, setStep] = React.useState<"main" | "unit">("main");
  React.useEffect(() => { if (!open) return; setStep("main"); }, [open]);

  const handleMain = (type: "SPAREPART" | "PRODUCT" | "UNIT") => {
    if (type === "UNIT") { setStep("unit"); } else { onSelect(type); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Stok</DialogTitle>
          <DialogDescription>
            {step === "main" ? "Pilih jenis stok yang ingin ditambahkan." : "Pilih tipe unit."}
          </DialogDescription>
        </DialogHeader>
        {step === "main" ? (
          <div className="space-y-2.5">
            <PickerCard icon={Wrench} label="Sparepart" desc="Untuk kebutuhan servis, tidak tampil di POS."
              color="hover:border-blue-400" iconColor="text-blue-500" onClick={() => handleMain("SPAREPART")} />
            <PickerCard icon={ShoppingBag} label="Produk" desc="Untuk penjualan retail/POS."
              color="hover:border-emerald-400" iconColor="text-emerald-500" onClick={() => handleMain("PRODUCT")} />
            <PickerCard icon={Smartphone} label="Unit" desc="Perangkat baru atau second yang dijual di POS."
              color="hover:border-purple-400" iconColor="text-purple-500" onClick={() => handleMain("UNIT")} />
          </div>
        ) : (
          <div className="space-y-2.5">
            <PickerCard icon={Cpu} label="Unit Baru" desc="Perangkat baru dengan stok quantity."
              color="hover:border-indigo-400" iconColor="text-indigo-500" onClick={() => onSelect("UNIT_BARU")} />
            <PickerCard icon={Boxes} label="Unit Second" desc="Perangkat bekas dengan IMEI."
              color="hover:border-orange-400" iconColor="text-orange-500" onClick={() => onSelect("UNIT_SECOND")} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerCard({ icon: Icon, label, desc, color, iconColor, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all ${color} hover:shadow-sm`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted ${iconColor}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

/* ═══════════════════════ CATEGORY MANAGER ═══════════════════════ */

function CategoryManagerDialog({
  open, onOpenChange, brandSlug, itemType, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  brandSlug: string; itemType: string; onSuccess: () => void;
}) {
  const [selectedType, setSelectedType] = React.useState<string>(itemType);
  const [list, setList] = React.useState<CategoryV4Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  const TYPE_OPTIONS: { id: string; label: string }[] = [
    { id: "SPAREPART", label: "Sparepart" },
    { id: "PRODUCT", label: "Produk" },
    { id: "DEVICE_UNIT", label: "Unit" },
  ];

  const typeLabel = TYPE_OPTIONS.find((t) => t.id === selectedType)?.label ?? selectedType;

  React.useEffect(() => {
    setSelectedType(itemType);
  }, [itemType]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listCategoriesV4Action(brandSlug, selectedType);
    if (res.success) setList(res.data ?? []);
    setLoading(false);
  }, [brandSlug, selectedType]);

  React.useEffect(() => { if (open) load(); }, [open, load]);

  const handleCreate = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    const res = await createCategoryV4Action(brandSlug, { brandId: 0, name: newName.trim(), itemType: selectedType });
    setSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: "Kategori berhasil ditambahkan", type: "success" });
      setNewName("");
      load();
      onSuccess();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal menambah kategori", type: "error" });
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    const res = await updateCategoryV4Action(brandSlug, id, { name: editName.trim() });
    setSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: "Kategori diperbarui", type: "success" });
      setEditingId(null);
      load();
      onSuccess();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal memperbarui", type: "error" });
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const res = await updateCategoryV4Action(brandSlug, id, { isActive: !current });
    if (res.success) {
      load();
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kelola Kategori — {typeLabel}</DialogTitle>
          <DialogDescription>Tambahkan atau ubah kategori stok untuk tipe {typeLabel.toLowerCase()}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border bg-muted/40 p-1">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedType(opt.id)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selectedType === opt.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
              className="h-9 text-xs" placeholder={`Nama kategori ${typeLabel.toLowerCase()} baru`} />
            <Button size="sm" className="h-9 shrink-0 text-xs" onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3.5" />}
            </Button>
          </div>

          <Separator />

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Belum ada kategori.</p>
          ) : (
            <div className="space-y-1">
              {list.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  {editingId === cat.id ? (
                    <>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1 text-xs" autoFocus />
                      <Button size="icon" variant="ghost" className="size-7 text-emerald-500" onClick={() => handleUpdate(cat.id)}>
                        <Check className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" onClick={() => setEditingId(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs">{cat.name}</span>
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground"
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                        <Pen className="size-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className={`size-7 ${cat.isActive ? "text-muted-foreground" : "text-destructive"}`}
                        onClick={() => handleToggleActive(cat.id, cat.isActive)}>
                        {cat.isActive ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════ PRODUCT TAB ═══════════════════════ */

function ProductTabContent({
  search, onSearchChange, loading, data, total, page, totalPages, onPageChange, canManage,
  branchMap, categories, brandSlug,
  statusFilter, onStatusFilterChange,
  refresh,
}: {
  search: string; onSearchChange: (v: string) => void;
  loading: boolean; data: ProductV4Row[] | null; total: number;
  page: number; totalPages: number; onPageChange: (p: number) => void;
  canManage: boolean;
  branchMap: Map<string, string>;
  categories: CategoryV4Row[];
  brandSlug: string;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  refresh: () => void;
}) {
  const [detailProduct, setDetailProduct] = React.useState<ProductDetailV4Row | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [confirmState, setConfirmState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "", variant: "default", onConfirm: async () => {} });

  const openConfirm = React.useCallback(
    (opts: { title: string; description: string; confirmLabel: string; variant?: "default" | "destructive"; onConfirm: () => Promise<void> }) => {
      setConfirmState({ ...opts, variant: opts.variant ?? "destructive", open: true });
    },
    [],
  );

  const openDetail = React.useCallback(async (productId: string) => {
    setDetailLoading(true);
    const res = await getProductDetailV4Action(brandSlug, productId);
    setDetailLoading(false);
    if (res.success) {
      setDetailProduct(res.data);
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal memuat detail", type: "error" });
    }
  }, [brandSlug]);

  const handleDeactivateProduct = React.useCallback(async (productId: string, name: string, currentActive: boolean) => {
    const action = currentActive ? deactivateProductV4Action : reactivateProductV4Action;
    const res = await action(brandSlug, productId);
    if (res.success) {
      triggerDynamicIslandFeedback({
        title: currentActive ? "Produk dinonaktifkan" : "Produk diaktifkan kembali",
        type: "success",
      });
      refresh();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal mengubah status", type: "error" });
    }
  }, [brandSlug, refresh]);

  const promptDeactivateProduct = React.useCallback((productId: string, name: string, currentActive: boolean) => {
    openConfirm({
      title: currentActive ? "Nonaktifkan item?" : "Aktifkan kembali item?",
      description: currentActive
        ? `${name} akan disembunyikan dari daftar aktif, POS, dan stok opname. Riwayat transaksi tetap tersimpan.`
        : `${name} akan kembali muncul sesuai tipe stoknya.`,
      confirmLabel: currentActive ? "Nonaktifkan" : "Aktifkan",
      variant: currentActive ? "destructive" : "default",
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        await handleDeactivateProduct(productId, name, currentActive);
      },
    });
  }, [openConfirm, handleDeactivateProduct]);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama..." value={search}
            onChange={(e) => onSearchChange(e.target.value)} className="h-9 max-w-xs pl-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
            <SelectItem value="ACTIVE" className="text-xs">Aktif</SelectItem>
            <SelectItem value="INACTIVE" className="text-xs">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="grid grid-cols-[2fr_1fr_60px_70px_100px_70px_44px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Nama</span><span>Kategori</span><span>Variasi</span><span>Stok</span><span>Harga Jual</span><span>Status</span><span />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : data && data.length > 0 ? data.map((item: ProductV4Row) => {
          const catName = categories.find((c) => c.id === item.categoryId)?.name ?? "—";
          const priceLabel =
            item.priceMin > 0 && item.priceMax > 0
              ? item.priceMin === item.priceMax
                ? formatRp(item.priceMin)
                : `${formatRp(item.priceMin)} — ${formatRp(item.priceMax)}`
              : "—";
          return (
            <div key={item.id}
              className={`relative grid grid-cols-[2fr_1fr_60px_70px_100px_70px_44px] gap-2 border-b px-3 py-2.5 text-xs transition-colors last:border-0 hover:bg-muted/20 ${!item.isActive ? "bg-muted/30 opacity-70" : ""}`}
            >
              <button className="flex min-w-0 items-center gap-2 text-left transition-colors hover:text-info" onClick={() => openDetail(item.id)}>
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.isActive ? "bg-primary/10" : "bg-muted"}`}>
                  <Package className={`size-3.5 ${item.isActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                </div>
              </button>
              <div className="flex items-center text-[10px] text-muted-foreground">{catName}</div>
              <div className="flex items-center text-[10px] text-muted-foreground">{item.variantsCount}</div>
              <div className="flex items-center tabular-nums">{item.totalStock}</div>
              <div className="flex items-center text-[10px] tabular-nums">{priceLabel}</div>
              <div className="flex items-center">
                <Badge variant={item.isActive ? "default" : "outline"} className="h-5 rounded-full px-2 text-[10px] font-normal">
                  {item.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-center">
                {canManage && (
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground"
                    onClick={() => promptDeactivateProduct(item.id, item.name, item.isActive)}>
                    {item.isActive ? <XCircle className="size-3.5" /> : <Check className="size-3.5 text-emerald-500" />}
                  </Button>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            <Package className="mr-2 size-5 text-muted-foreground/30" /> Tidak ada data
          </div>
        )}
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        )}
      </div>

      <ConfirmActionDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((s) => ({ ...s, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
      />

      <VariantDetailDialog
        product={detailProduct}
        loading={detailLoading}
        brandSlug={brandSlug}
        categories={categories}
        canManage={canManage}
        onRefreshList={refresh}
        onReloadDetail={(productId) => openDetail(productId)}
        onClose={() => setDetailProduct(null)}
      />
    </>
  );
}

function VariantDetailDialog({
  product,
  loading,
  brandSlug,
  categories: cats,
  canManage,
  onRefreshList,
  onReloadDetail,
  onClose,
}: {
  product: ProductDetailV4Row | null;
  loading: boolean;
  brandSlug: string;
  categories: CategoryV4Row[];
  canManage: boolean;
  onRefreshList: () => void;
  onReloadDetail: (productId: string) => void;
  onClose: () => void;
}) {
  const [variantConfirm, setVariantConfirm] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", onConfirm: async () => {} });
  const [variantLoading, setVariantLoading] = React.useState(false);
  const [productActionLoading, setProductActionLoading] = React.useState(false);
  const [productConfirm, setProductConfirm] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "destructive";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "", variant: "destructive", onConfirm: async () => {} });
  const [editProductOpen, setEditProductOpen] = React.useState(false);
  const [editingVariant, setEditingVariant] = React.useState<VariantV4Row | null>(null);
  const [addVariantOpen, setAddVariantOpen] = React.useState(false);

  const promptProductAction = React.useCallback(() => {
    if (!product?.product) return;
    const currentActive = product.product.isActive;
    const productId = product.product.id;
    const productName = product.product.name;
    setProductConfirm({
      open: true,
      title: currentActive ? "Nonaktifkan item?" : "Aktifkan kembali item?",
      description: currentActive
        ? `${productName} akan disembunyikan dari daftar aktif, POS, dan stok opname. Riwayat transaksi tetap tersimpan.`
        : `${productName} akan kembali muncul sesuai tipe stoknya.`,
      confirmLabel: currentActive ? "Nonaktifkan" : "Aktifkan",
      variant: currentActive ? "destructive" : "default",
      onConfirm: async () => {
        setProductActionLoading(true);
        const action = currentActive ? deactivateProductV4Action : reactivateProductV4Action;
        const res = await action(brandSlug, productId);
        setProductActionLoading(false);
        if (res.success) {
          triggerDynamicIslandFeedback({ title: currentActive ? "Item dinonaktifkan" : "Item diaktifkan kembali", type: "success" });
          setProductConfirm((s) => ({ ...s, open: false }));
          onReloadDetail(productId);
          onRefreshList();
        } else {
          triggerDynamicIslandFeedback({ title: res.error || "Gagal mengubah status item", type: "error" });
        }
      },
    });
  }, [brandSlug, onRefreshList, onReloadDetail, product?.product]);

  const handleVariantAction = React.useCallback(async (variantId: string, variantName: string, currentActive: boolean) => {
    setVariantLoading(true);
    const action = currentActive ? deactivateVariantV4Action : reactivateVariantV4Action;
    const res = await action(brandSlug, variantId);
    setVariantLoading(false);
    if (res.success) {
      triggerDynamicIslandFeedback({
        title: currentActive ? "Varian dinonaktifkan" : "Varian diaktifkan kembali",
        type: "success",
      });
      setVariantConfirm((s) => ({ ...s, open: false }));
      if (product?.product.id) onReloadDetail(product.product.id);
      onRefreshList();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal mengubah status varian", type: "error" });
    }
  }, [brandSlug, onRefreshList, onReloadDetail, product?.product.id]);

  const promptVariantAction = React.useCallback((variantId: string, variantName: string, currentActive: boolean) => {
    setVariantConfirm({
      open: true,
      title: currentActive ? "Nonaktifkan varian?" : "Aktifkan varian?",
      description: currentActive
        ? `Varian "${variantName}" akan disembunyikan dari POS, belanja stok, dan stok opname. Riwayat transaksi tetap tersimpan.`
        : `Varian "${variantName}" akan tersedia kembali.`,
      onConfirm: async () => {
        await handleVariantAction(variantId, variantName, currentActive);
      },
    });
  }, [handleVariantAction]);

  const stockLabel = (current: number, min: number) => {
    if (current === 0) return { label: "Habis", className: "text-destructive font-medium" };
    if (min > 0 && current <= min) return { label: "Menipis", className: "text-amber-500 font-medium" };
    return { label: "Aman", className: "text-emerald-600" };
  };

  const totalVariantStock = product?.variants.reduce((sum, v) => sum + v.currentStock, 0) ?? 0;
  const prices = product?.variants.map((v) => v.sellingPrice).filter((p) => p > 0) ?? [];
  const priceMinStr = prices.length > 0 ? formatRp(Math.min(...prices)) : null;
  const priceMaxStr = prices.length > 0 ? formatRp(Math.max(...prices)) : null;

  return (
    <Dialog open={!!product || loading} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="truncate text-base">{product?.product?.name ?? "Memuat..."}</DialogTitle>
              {product?.product && (
                <>
                  <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-normal">
                    {productKindLabel(product.product.productKind, product.product.conditionType)}
                  </Badge>
                  <Badge variant={product.product.isActive ? "default" : "outline"} className="h-5 rounded-full px-2 text-[10px] font-normal">
                    {product.product.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </>
              )}
            </div>
            {product?.product && canManage && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-[10px]" onClick={() => setAddVariantOpen(true)}>
                  <Plus className="size-3" /> Add Varian
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-[10px]" onClick={() => setEditProductOpen(true)}>
                  <Pen className="size-3" /> Edit Item
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-[10px]" onClick={promptProductAction}>
                  {product.product.isActive ? <Trash2 className="size-3" /> : <Check className="size-3 text-emerald-500" />}
                  {product.product.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            )}
          </div>
          <DialogDescription className="text-xs">
            {product?.product ? (
              <>
                Kategori: {cats.find((c: CategoryV4Row) => c.id === product.product.categoryId)?.name ?? "—"} &middot;
                Total {product.variants.length} varian &middot;
                Stok: {totalVariantStock}
                {priceMinStr && priceMaxStr && (
                  <span> &middot; Harga: {priceMinStr === priceMaxStr ? priceMinStr : `${priceMinStr} — ${priceMaxStr}`}</span>
                )}
              </>
            ) : "Memuat detail..."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : product ? (
          <div className="space-y-3">
            {product.variants.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada varian.</p>
            ) : (
      <div className="overflow-x-auto rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_70px_90px_70px_72px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Varian</span><span>SKU / Barcode</span><span>Stok</span><span>Harga Jual</span><span>Status</span><span>Aksi</span>
        </div>
        {product.variants.map((v: VariantV4Row) => {
                  const sl = stockLabel(v.currentStock, v.minStock);
                  return (
                    <div key={v.id}
                      className={`grid grid-cols-[2fr_1fr_70px_90px_70px_72px] gap-2 border-b px-3 py-2.5 text-xs last:border-0 items-center ${!v.isActive ? "opacity-50" : ""}`}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{v.name}</p>
                        {Object.keys(v.attributes).length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {Object.values(v.attributes).filter(Boolean).map((attr, i) => (
                              <span key={i} className="inline-block rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{attr}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-[10px] text-muted-foreground">
                        {v.sku && <p className="truncate">SKU: {v.sku}</p>}
                        {v.barcode && <p className="truncate">BC: {v.barcode}</p>}
                        {!v.sku && !v.barcode && <span className="text-muted-foreground/50">—</span>}
                      </div>
                      <div className="flex items-center tabular-nums">
                        <span className={sl.className}>{sl.label}</span>
                        <span className="ml-1 text-muted-foreground">({v.currentStock})</span>
                      </div>
                      <div className="flex items-center text-[10px] tabular-nums">{formatRp(v.sellingPrice)}</div>
                      <div className="flex items-center">
                        <Badge variant={v.isActive ? "default" : "outline"} className="h-5 rounded-full px-2 text-[10px] font-normal">
                          {v.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" title="Edit varian" onClick={() => setEditingVariant(v)}>
                              <Pen className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" title={v.isActive ? "Nonaktifkan varian" : "Aktifkan varian"}
                              onClick={() => promptVariantAction(v.id, v.name, v.isActive)}>
                              {v.isActive
                                ? <Trash2 className="size-3.5 text-muted-foreground/60 hover:text-destructive" />
                                : <Check className="size-3.5 text-emerald-500" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {product.unitSecondSummary && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ringkasan Unit Second</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>Total: <strong>{product.unitSecondSummary.total}</strong></span>
                  <span className="text-emerald-600">Ready: <strong>{product.unitSecondSummary.readyStock}</strong></span>
                  <span className="text-blue-600">Reserved: <strong>{product.unitSecondSummary.reserved}</strong></span>
                  <span className="text-muted-foreground">Terjual: <strong>{product.unitSecondSummary.sold}</strong></span>
                  <span className="text-orange-600">Servis: <strong>{product.unitSecondSummary.inService}</strong></span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {product?.product && (
          <EditProductV4Dialog
            open={editProductOpen}
            onOpenChange={setEditProductOpen}
            brandSlug={brandSlug}
            product={product.product}
            categories={cats}
            onSuccess={() => {
              setEditProductOpen(false);
              onReloadDetail(product.product.id);
              onRefreshList();
            }}
          />
        )}

        {product?.product && editingVariant && (
          <EditVariantV4Dialog
            open={!!editingVariant}
            onOpenChange={(open: boolean) => { if (!open) setEditingVariant(null); }}
            brandSlug={brandSlug}
            variant={editingVariant}
            onSuccess={() => {
              setEditingVariant(null);
              onReloadDetail(product.product.id);
              onRefreshList();
            }}
          />
        )}

        {product?.product && (
          <AddVariantV4Dialog
            open={addVariantOpen}
            onOpenChange={setAddVariantOpen}
            brandSlug={brandSlug}
            productId={product.product.id}
            productName={product.product.name}
            onSuccess={() => {
              setAddVariantOpen(false);
              onReloadDetail(product.product.id);
              onRefreshList();
            }}
          />
        )}

        <ConfirmActionDialog
          open={productConfirm.open}
          onOpenChange={(open) => setProductConfirm((s) => ({ ...s, open }))}
          title={productConfirm.title}
          description={productConfirm.description}
          confirmLabel={productConfirm.confirmLabel}
          variant={productConfirm.variant}
          isLoading={productActionLoading}
          onConfirm={productConfirm.onConfirm}
        />

        <ConfirmActionDialog
          open={variantConfirm.open}
          onOpenChange={(open) => setVariantConfirm((s) => ({ ...s, open }))}
          title={variantConfirm.title}
          description={variantConfirm.description}
          confirmLabel={variantConfirm.title.startsWith("Nonaktifkan") ? "Nonaktifkan Varian" : "Aktifkan Varian"}
          variant={variantConfirm.title.startsWith("Nonaktifkan") ? "destructive" : "default"}
          isLoading={variantLoading}
          onConfirm={variantConfirm.onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditProductV4Dialog({
  open, onOpenChange, brandSlug, product, categories, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  product: ProductV4Row;
  categories: CategoryV4Row[];
  onSuccess: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState(product.name);
  const [categoryId, setCategoryId] = React.useState(product.categoryId ?? "NONE");
  const [description, setDescription] = React.useState(product.description ?? "");
  const [imageUrl, setImageUrl] = React.useState(product.imageUrl ?? "");
  const [isActive, setIsActive] = React.useState(product.isActive);

  React.useEffect(() => {
    if (!open) return;
    setName(product.name);
    setCategoryId(product.categoryId ?? "NONE");
    setDescription(product.description ?? "");
    setImageUrl(product.imageUrl ?? "");
    setIsActive(product.isActive);
  }, [open, product]);

  const title = product.productKind === "SPAREPART"
    ? "Edit Sparepart"
    : product.productKind === "UNIT" && product.conditionType === "NEW"
      ? "Edit Unit Baru"
      : product.productKind === "UNIT" && product.conditionType === "SECOND"
        ? "Edit Unit Second"
        : "Edit Produk";

  const categoryTypeLabel = product.productKind === "SPAREPART"
    ? "Sparepart"
    : product.productKind === "UNIT"
      ? product.conditionType === "NEW" ? "Unit Baru" : "Unit Second"
      : "Produk";

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const input: UpdateProductV4Input = {
      productId: product.id,
      name: name.trim(),
      categoryId: categoryId === "NONE" ? null : categoryId,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      isActive,
    };
    const res = await updateProductV4Action(brandSlug, input);
    setSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: "Item berhasil diperbarui", type: "success" });
      onSuccess();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal memperbarui item", type: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Ubah informasi item tanpa mengubah stok.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nama Item</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Kategori · {categoryTypeLabel}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE" className="text-xs">Tanpa kategori</SelectItem>
                {categories.map((cat) => <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-20 text-xs" />
          </div>
          <div>
            <Label className="text-xs">URL Gambar</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 h-9 text-xs" placeholder="https://..." />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label className="text-xs">Status Aktif</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button className="h-9 w-full text-xs" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            Simpan Perubahan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditVariantV4Dialog({
  open, onOpenChange, brandSlug, variant, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  variant: VariantV4Row;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState(variant.name);
  const [attributesText, setAttributesText] = React.useState(JSON.stringify(variant.attributes ?? {}, null, 2));
  const [sku, setSku] = React.useState(variant.sku ?? "");
  const [barcode, setBarcode] = React.useState(variant.barcode ?? "");
  const [unit, setUnit] = React.useState(variant.unit ?? "pcs");
  const [minStock, setMinStock] = React.useState(variant.minStock);
  const [costPrice, setCostPrice] = React.useState(variant.costPrice);
  const [sellingPrice, setSellingPrice] = React.useState(variant.sellingPrice);
  const [imageUrl, setImageUrl] = React.useState(variant.imageUrl ?? "");
  const [isActive, setIsActive] = React.useState(variant.isActive);

  React.useEffect(() => {
    if (!open) return;
    setName(variant.name);
    setAttributesText(JSON.stringify(variant.attributes ?? {}, null, 2));
    setSku(variant.sku ?? "");
    setBarcode(variant.barcode ?? "");
    setUnit(variant.unit ?? "pcs");
    setMinStock(variant.minStock);
    setCostPrice(variant.costPrice);
    setSellingPrice(variant.sellingPrice);
    setImageUrl(variant.imageUrl ?? "");
    setIsActive(variant.isActive);
  }, [open, variant]);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    let attributes: Record<string, string> = {};
    try {
      attributes = attributesText.trim() ? JSON.parse(attributesText) : {};
    } catch {
      triggerDynamicIslandFeedback({ title: "Format attributes harus JSON valid", type: "error" });
      return;
    }
    setSaving(true);
    const input: UpdateVariantV4Input = {
      variantId: variant.id,
      name: name.trim(),
      attributes,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      unit: unit.trim() || "pcs",
      minStock,
      costPrice,
      sellingPrice,
      imageUrl: imageUrl.trim() || null,
      isActive,
    };
    const res = await updateVariantV4Action(brandSlug, input);
    setSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: "Varian berhasil diperbarui", type: "success" });
      onSuccess();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal memperbarui varian", type: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Varian</DialogTitle>
          <DialogDescription>Stok tidak diedit dari sini. Gunakan Belanja Stok atau Penyesuaian Stok.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nama Varian</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Attributes / Opsi Variasi (JSON)</Label>
            <Textarea value={attributesText} onChange={(e) => setAttributesText(e.target.value)} className="mt-1 min-h-24 font-mono text-xs" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Barcode</Label><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Satuan</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Minimum Stok</Label><Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Harga Modal</Label><Input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Harga Jual</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div>
            <Label className="text-xs">URL Gambar</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 h-9 text-xs" placeholder="https://..." />
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            Stok saat ini: <strong>{variant.currentStock}</strong>. Stok hanya berubah melalui Belanja Stok, Penyesuaian Stok, POS, Service Usage, atau Void/Reversal.
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label className="text-xs">Status Aktif</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button className="h-9 w-full text-xs" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            Simpan Varian
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════ ADD VARIANT ═══════════════════════ */

function AddVariantV4Dialog({
  open, onOpenChange, brandSlug, productId, productName, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  productId: string;
  productName: string;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [attributesText, setAttributesText] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [unit, setUnit] = React.useState("pcs");
  const [minStock, setMinStock] = React.useState(0);
  const [costPrice, setCostPrice] = React.useState(0);
  const [sellingPrice, setSellingPrice] = React.useState(0);
  const [imageUrl, setImageUrl] = React.useState("");
  const [initialStock, setInitialStock] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setAttributesText("");
    setSku("");
    setBarcode("");
    setUnit("pcs");
    setMinStock(0);
    setCostPrice(0);
    setSellingPrice(0);
    setImageUrl("");
    setInitialStock(0);
  }, [open]);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    let attributes: Record<string, string> = {};
    try {
      attributes = attributesText.trim() ? JSON.parse(attributesText) : {};
    } catch {
      triggerDynamicIslandFeedback({ title: "Format attributes harus JSON valid", type: "error" });
      return;
    }
    setSaving(true);
    const input: CreateVariantV4Input = {
      productId,
      name: name.trim(),
      attributes,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      unit: unit.trim() || "pcs",
      minStock,
      costPrice,
      sellingPrice,
      imageUrl: imageUrl.trim() || null,
      initialStock,
    };
    const res = await createVariantV4Action(brandSlug, input);
    setSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: "Varian berhasil ditambahkan", type: "success" });
      onSuccess();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal menambahkan varian", type: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Varian</DialogTitle>
          <DialogDescription>
            Tambah varian baru untuk <span className="font-medium">{productName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nama Varian</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 text-xs" placeholder="Contoh: Hitam 128GB" />
          </div>
          <div>
            <Label className="text-xs">Attributes / Opsi Variasi (JSON)</Label>
            <Textarea value={attributesText} onChange={(e) => setAttributesText(e.target.value)} className="mt-1 min-h-24 font-mono text-xs" placeholder='{"warna":"Hitam","kapasitas":"128GB"}' />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Barcode</Label><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Satuan</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Minimum Stok</Label><Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Harga Modal</Label><Input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Harga Jual</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div>
            <Label className="text-xs">URL Gambar</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 h-9 text-xs" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Stok Awal</Label>
            <Input type="number" value={initialStock} onChange={(e) => setInitialStock(Number(e.target.value))} className="mt-1 h-9 text-xs" />
          </div>
          <Button className="h-9 w-full text-xs" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            Tambah Varian
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════ UNIT SECOND TAB ═══════════════════════ */

function UnitSecondTab({
  usSearch, setUsSearch, usStatusFilter, setUsStatusFilter,
  usLoading, usData, usPage, usTotalPages, setUsPage, branchMap,
  brandSlug, canManage, refresh,
}: {
  usSearch: string; setUsSearch: (v: string) => void;
  usStatusFilter: string; setUsStatusFilter: (v: string) => void;
  usLoading: boolean; usData: { data: UnitSecondV4Row[]; total: number } | null;
  usPage: number; usTotalPages: number; setUsPage: (p: number) => void;
  branchMap: Map<string, string>;
  brandSlug: string;
  canManage: boolean;
  refresh: () => void;
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari IMEI/serial/barcode..." value={usSearch}
            onChange={(e) => setUsSearch(e.target.value)} className="h-9 w-full max-w-xs pl-8 text-xs" />
        </div>
        <Select value={usStatusFilter} onValueChange={setUsStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
            <SelectItem value="READY_STOCK" className="text-xs">Ready</SelectItem>
            <SelectItem value="RESERVED" className="text-xs">Reserved</SelectItem>
            <SelectItem value="SOLD" className="text-xs">Terjual</SelectItem>
            <SelectItem value="IN_SERVICE" className="text-xs">Dipakai Servis</SelectItem>
            <SelectItem value="DEFECTIVE" className="text-xs">Rusak</SelectItem>
            <SelectItem value="ARCHIVED" className="text-xs">Arsip</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UnitSecondTable
        loading={usLoading}
        data={usData?.data ?? null}
        page={usPage}
        totalPages={usTotalPages}
        onPageChange={setUsPage}
        branchMap={branchMap}
        brandSlug={brandSlug}
        canManage={canManage}
        refresh={refresh}
      />
    </>
  );
}

function UnitSecondTable({
  loading, data, page, totalPages, onPageChange, branchMap,
  brandSlug, canManage, refresh,
}: {
  loading: boolean; data: UnitSecondV4Row[] | null;
  page: number; totalPages: number; onPageChange: (p: number) => void;
  branchMap: Map<string, string>;
  brandSlug: string;
  canManage: boolean;
  refresh: () => void;
}) {
  const [unitConfirm, setUnitConfirm] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive";
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", variant: "destructive", confirmLabel: "", onConfirm: async () => {} });
  const [unitLoading, setUnitLoading] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<UnitSecondV4Row | null>(null);

  const handleUnitAction = React.useCallback(async (unitId: string, currentStatus: string) => {
    setUnitLoading(true);
    const isArchive = currentStatus !== "ARCHIVED";
    const action = isArchive ? archiveUnitSecondV4Action : reactivateUnitSecondV4Action;
    const res = await action(brandSlug, unitId);
    setUnitLoading(false);
    if (res.success) {
      triggerDynamicIslandFeedback({
        title: isArchive ? "Unit diarsipkan" : "Unit diaktifkan kembali",
        type: "success",
      });
      setUnitConfirm((s) => ({ ...s, open: false }));
      refresh();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal mengubah status unit", type: "error" });
    }
    setUnitLoading(false);
  }, [brandSlug, refresh]);

  const promptUnitAction = React.useCallback((unitId: string, productName: string, currentStatus: string) => {
    if (currentStatus === "SOLD") {
      triggerDynamicIslandFeedback({
        title: "Tidak bisa diarsipkan",
        description: "Unit yang sudah terjual tidak bisa diarsipkan langsung.",
        type: "error",
      });
      return;
    }
    const isArchive = currentStatus !== "ARCHIVED";
    setUnitConfirm({
      open: true,
      title: isArchive ? "Arsipkan unit?" : "Aktifkan unit?",
      description: isArchive
        ? `${productName} akan disembunyikan dari stok ready. Riwayat tetap aman.`
        : `${productName} akan tersedia kembali sebagai stok ready.`,
      confirmLabel: isArchive ? "Arsipkan Unit" : "Aktifkan Unit",
      variant: isArchive ? "destructive" : "default",
      onConfirm: async () => {
        await handleUnitAction(unitId, currentStatus);
      },
    });
  }, [handleUnitAction]);

  const colCount = canManage ? 7 : 6;

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <th className="px-3 py-2.5">Unit</th>
            <th className="px-3 py-2.5">IMEI</th>
            <th className="px-3 py-2.5">BH</th>
            <th className="px-3 py-2.5">Harga Jual</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Cabang</th>
                {canManage && <th className="px-3 py-2.5 w-16">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={colCount} className="px-3 py-12 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></td></tr>
          ) : data && data.length > 0 ? data.map((u) => {
            const attributes = u.unitAttributes as Record<string, string> | null;
            const displayName = [attributes?.Warna, attributes?.Storage].filter(Boolean).join(" / ");
            return (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <div>
                    <p className="font-medium">{u.productName}</p>
                    {displayName && <p className="text-[10px] text-muted-foreground">{displayName}</p>}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px]">{u.imei ?? "—"}</td>
                <td className="px-3 py-2.5">{u.batteryHealth !== null ? `${u.batteryHealth}%` : "—"}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatRp(u.sellingPrice)}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={u.status === "READY_STOCK" ? "default" : u.status === "ARCHIVED" ? "outline" : "secondary"}
                    className="h-5 rounded-full px-2 text-[10px] font-normal">
                    {unitStatusLabel(u.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{branchMap.get(u.branchId) ?? "—"}</td>
                {canManage && (
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" title="Edit unit" onClick={() => setEditingUnit(u)}>
                      <Pen className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 text-muted-foreground"
                      onClick={() => promptUnitAction(u.id, u.productName, u.status)}>
                      {u.status === "ARCHIVED" ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Trash2 className="size-3.5 text-muted-foreground/60 hover:text-destructive" />
                      )}
                    </Button>
                    </div>
                  </td>
                )}
              </tr>
            );
          }) : (
            <tr><td colSpan={colCount} className="px-3 py-12 text-center text-muted-foreground">Tidak ada unit second</td></tr>
          )}
        </tbody>
      </table>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />}

      {editingUnit && (
        <EditUnitSecondV4Dialog
          open={!!editingUnit}
          onOpenChange={(open: boolean) => { if (!open) setEditingUnit(null); }}
          brandSlug={brandSlug}
          unit={editingUnit}
          onSuccess={() => {
            setEditingUnit(null);
            refresh();
          }}
        />
      )}

      <ConfirmActionDialog
        open={unitConfirm.open}
        onOpenChange={(open) => setUnitConfirm((s) => ({ ...s, open }))}
        title={unitConfirm.title}
        description={unitConfirm.description}
        confirmLabel={unitConfirm.confirmLabel}
        variant={unitConfirm.variant}
        isLoading={unitLoading}
        onConfirm={unitConfirm.onConfirm}
      />
    </div>
  );
}

function EditUnitSecondV4Dialog({
  open, onOpenChange, brandSlug, unit, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  unit: UnitSecondV4Row;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [warna, setWarna] = React.useState((unit.unitAttributes as any)?.Warna ?? "");
  const [storage, setStorage] = React.useState((unit.unitAttributes as any)?.Storage ?? "");
  const [imei, setImei] = React.useState(unit.imei ?? "");
  const [serialNumber, setSerialNumber] = React.useState(unit.serialNumber ?? "");
  const [barcode, setBarcode] = React.useState(unit.barcode ?? "");
  const [imageUrl, setImageUrl] = React.useState(unit.imageUrl ?? "");
  const [batteryHealth, setBatteryHealth] = React.useState<number | "">(unit.batteryHealth ?? "");
  const [conditionGrade, setConditionGrade] = React.useState(unit.conditionGrade ?? "");
  const [physicalNotes, setPhysicalNotes] = React.useState(unit.physicalConditionNotes ?? "");
  const [functionalNotes, setFunctionalNotes] = React.useState(unit.functionalConditionNotes ?? "");
  const [accessories, setAccessories] = React.useState(unit.accessoriesIncluded ?? "");
  const [warrantyUntil, setWarrantyUntil] = React.useState(unit.warrantyUntil ?? "");
  const [warrantyNotes, setWarrantyNotes] = React.useState(unit.warrantyNotes ?? "");
  const [purchaseCost, setPurchaseCost] = React.useState(unit.purchaseCost);
  const [sellingPrice, setSellingPrice] = React.useState(unit.sellingPrice);

  React.useEffect(() => {
    if (!open) return;
    setWarna((unit.unitAttributes as any)?.Warna ?? "");
    setStorage((unit.unitAttributes as any)?.Storage ?? "");
    setImei(unit.imei ?? "");
    setSerialNumber(unit.serialNumber ?? "");
    setBarcode(unit.barcode ?? "");
    setImageUrl(unit.imageUrl ?? "");
    setBatteryHealth(unit.batteryHealth ?? "");
    setConditionGrade(unit.conditionGrade ?? "");
    setPhysicalNotes(unit.physicalConditionNotes ?? "");
    setFunctionalNotes(unit.functionalConditionNotes ?? "");
    setAccessories(unit.accessoriesIncluded ?? "");
    setWarrantyUntil(unit.warrantyUntil ?? "");
    setWarrantyNotes(unit.warrantyNotes ?? "");
    setPurchaseCost(unit.purchaseCost);
    setSellingPrice(unit.sellingPrice);
  }, [open, unit]);

  const handleSave = async () => {
    if (saving) return;
    const bh = batteryHealth === "" ? null : Number(batteryHealth);
    if (bh !== null && (bh < 0 || bh > 100)) {
      triggerDynamicIslandFeedback({ title: "Battery health harus antara 0-100", type: "error" });
      return;
    }
    setSaving(true);
    const input: UpdateUnitSecondV4Input = {
      unitId: unit.id,
      unitAttributes: { ...(unit.unitAttributes ?? {}), Warna: warna, Storage: storage },
      imei: imei.trim() || null,
      serialNumber: serialNumber.trim() || null,
      barcode: barcode.trim() || null,
      imageUrl: imageUrl.trim() || null,
      batteryHealth: bh,
      conditionGrade: conditionGrade.trim() || null,
      physicalConditionNotes: physicalNotes.trim() || null,
      functionalConditionNotes: functionalNotes.trim() || null,
      accessoriesIncluded: accessories.trim() || null,
      warrantyUntil: warrantyUntil || null,
      warrantyNotes: warrantyNotes.trim() || null,
      purchaseCost,
      sellingPrice,
    };
    const res = await updateUnitSecondV4Action(brandSlug, input);
    setSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: "Unit second berhasil diperbarui", type: "success" });
      onSuccess();
    } else {
      triggerDynamicIslandFeedback({ title: res.error || "Gagal memperbarui unit second", type: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Unit Second</DialogTitle>
          <DialogDescription>Edit metadata dan harga. Perubahan status stok tetap melalui aksi arsip/aktifkan atau transaksi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Warna</Label><Input value={warna} onChange={(e) => setWarna(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Storage</Label><Input value={storage} onChange={(e) => setStorage(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div><Label className="text-xs">IMEI</Label><Input value={imei} onChange={(e) => setImei(e.target.value)} className="mt-1 h-9 text-xs font-mono" /></div>
            <div><Label className="text-xs">Serial Number</Label><Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Barcode</Label><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div><Label className="text-xs">Battery Health</Label><Input type="number" value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value ? Number(e.target.value) : "")} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Kondisi</Label><Input value={conditionGrade} onChange={(e) => setConditionGrade(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">URL Gambar</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Catatan Fisik</Label><Textarea value={physicalNotes} onChange={(e) => setPhysicalNotes(e.target.value)} className="mt-1 min-h-20 text-xs" /></div>
            <div><Label className="text-xs">Catatan Fungsi</Label><Textarea value={functionalNotes} onChange={(e) => setFunctionalNotes(e.target.value)} className="mt-1 min-h-20 text-xs" /></div>
          </div>
          <div><Label className="text-xs">Kelengkapan</Label><Input value={accessories} onChange={(e) => setAccessories(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Garansi Sampai</Label><Input type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Catatan Garansi</Label><Input value={warrantyNotes} onChange={(e) => setWarrantyNotes(e.target.value)} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><Label className="text-xs">Harga Modal</Label><Input type="number" value={purchaseCost} onChange={(e) => setPurchaseCost(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
            <div><Label className="text-xs">Harga Jual / Nett</Label><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="mt-1 h-9 text-xs" /></div>
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            Status saat ini: <strong>{unitStatusLabel(unit.status)}</strong>. Status tidak diubah dari dialog ini.
          </div>
          <Button className="h-9 w-full text-xs" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            Simpan Unit Second
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════ MOVEMENT TAB ═══════════════════════ */

function MovementTab({
  brandSlug, activeBranchId, refreshKey, branchMap,
}: {
  brandSlug: string; activeBranchId: string | null; refreshKey: number; branchMap: Map<string, string>;
}) {
  const [movements, setMovements] = React.useState<{ data: InventoryMovementV4Row[]; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [movementType, setMovementType] = React.useState("ALL");

  const totalPages = movements ? Math.max(1, Math.ceil(movements.total / MAX_PAGE)) : 1;

  React.useEffect(() => {
    setLoading(true);
    listInventoryMovementsV4Action(brandSlug, {
      branchId: activeBranchId,
      movementType: movementType === "ALL" ? null : movementType,
      page,
      pageSize: MAX_PAGE,
    }).then((res) => {
      if (res.success) setMovements(res.data);
      setLoading(false);
    });
  }, [activeBranchId, brandSlug, page, movementType, refreshKey]);

  React.useEffect(() => { setPage(1); }, [movementType]);

  const movementTypes = [
    { value: "ALL", label: "Semua Tipe" },
    { value: "OPENING_STOCK", label: "Stok Awal" },
    { value: "PURCHASE_IN", label: "Pembelian" },
    { value: "UNIT_IN", label: "Unit Masuk" },
    { value: "UNIT_STATUS_CHANGE", label: "Ubah Status Unit" },
    { value: "UNIT_SOLD", label: "Unit Terjual" },
    { value: "POS_SALE", label: "Penjualan POS" },
    { value: "SERVICE_USAGE", label: "Pemakaian Servis" },
    { value: "STOCK_OPNAME_IN", label: "Opname Masuk" },
    { value: "STOCK_OPNAME_OUT", label: "Opname Keluar" },
    { value: "VOID_REVERSAL", label: "Void" },
    { value: "ADJUSTMENT", label: "Penyesuaian" },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={movementType} onValueChange={setMovementType}>
          <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {movementTypes.map((mt) => (
              <SelectItem key={mt.value} value={mt.value} className="text-xs">{mt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2.5">Tipe</th>
              <th className="px-3 py-2.5">Produk</th>
              <th className="px-3 py-2.5">Arah</th>
              <th className="px-3 py-2.5">Qty</th>
              <th className="px-3 py-2.5">Stok Awal</th>
              <th className="px-3 py-2.5">Stok Akhir</th>
              <th className="px-3 py-2.5">Keterangan</th>
              <th className="px-3 py-2.5">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-12 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></td></tr>
            ) : movements && movements.data.length > 0 ? movements.data.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">
                    {movementTypeLabel(m.movementType)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-medium">{m.productName || "—"}</td>
                <td className="px-3 py-2.5">
                  <Badge variant={m.direction === "IN" ? "default" : m.direction === "OUT" ? "destructive" : "secondary"}
                    className="h-5 rounded-full px-2 text-[10px] font-normal">
                    {movementDirectionLabel(m.direction)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{m.quantity}</td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{m.stockBefore ?? "—"}</td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{m.stockAfter ?? "—"}</td>
                <td className="px-3 py-2.5 max-w-[160px] truncate text-[10px] text-muted-foreground">{m.notes ?? m.referenceLabel ?? "—"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">Belum ada movement</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </>
  );
}

/* ═══════════════════════ PAGINATION ═══════════════════════ */

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t bg-card px-3 py-2.5">
      <Button variant="outline" size="icon" className="size-7 rounded-lg" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
        <ChevronLeft className="size-4" />
      </Button>
      <Button size="sm" className="h-7 min-w-7 rounded-lg px-2 text-xs">{page}</Button>
      <Button variant="outline" size="icon" className="size-7 rounded-lg" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

/* ═══════════════════════ QUANTITY FORM (Sparepart / Produk / Unit Baru) ═══════════════════════ */

function QuantityFormDialog({
  open, onOpenChange, formKind, brandSlug, branchId, onSuccess, categories,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  formKind: "SPAREPART" | "PRODUCT" | "UNIT_BARU";
  brandSlug: string; branchId: string; onSuccess: () => void;
  categories: CategoryV4Row[];
}) {
  const isSparepart = formKind === "SPAREPART";
  const isProduk = formKind === "PRODUCT";
  const isUnitBaru = formKind === "UNIT_BARU";

  const label = isSparepart ? "Sparepart" : isProduk ? "Produk" : "Unit Baru";

  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [hasVariants, setHasVariants] = React.useState(false);
  const [variants, setVariants] = React.useState<CreateVariantInput[]>([
    { name: "", initialStock: 0, costPrice: 0, sellingPrice: 0 },
  ]);

  const reset = () => {
    setName("");
    setImageUrl("");
    setCategoryId("");
    setHasVariants(false);
    setVariants([{ name: "", initialStock: 0, costPrice: 0, sellingPrice: 0 }]);
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const effectiveVariants = hasVariants
        ? variants.filter((v) => v.name.trim())
        : [{
          name: name.trim(),
          imageUrl: variants[0]?.imageUrl?.trim() || null,
          initialStock: variants[0]?.initialStock ?? 0,
          costPrice: variants[0]?.costPrice ?? 0,
          sellingPrice: variants[0]?.sellingPrice ?? 0,
        }];

      const input: any = {
        brandId: 0,
        branchId,
        name: name.trim(),
        imageUrl: imageUrl.trim() || null,
        categoryId: categoryId || null,
        variants: effectiveVariants,
      };

      let res;
      if (isSparepart) {
        res = await createSparepartV4Action(brandSlug, { ...input, productKind: "SPAREPART" });
      } else if (isProduk) {
        res = await createProductV4Action(brandSlug, { ...input, productKind: "PRODUCT" });
      } else {
        res = await createUnitBaruV4Action(brandSlug, { ...input, productKind: "UNIT", conditionType: "NEW" });
      }

      if (res.success) {
        triggerDynamicIslandFeedback({ title: `${label} berhasil ditambahkan`, type: "success" });
        onOpenChange(false);
        reset();
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({ title: res.error || `Gagal menambahkan ${label}`, type: "error" });
      }
    } catch (err: any) {
      triggerDynamicIslandFeedback({ title: err.message || "Terjadi kesalahan", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateVariant = (i: number, field: keyof CreateVariantInput, value: any) => {
    setVariants((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: "", initialStock: 0, costPrice: 0, sellingPrice: 0 }]);
  };

  const removeVariant = (i: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah {label}</DialogTitle>
          <DialogDescription>Isi detail {label.toLowerCase()} baru.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {categories.length > 0 && (
            <div>
              <Label className="text-xs">Kategori · {label}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Pilih kategori (opsional)" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Nama {label}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 text-xs" placeholder={`Nama ${label.toLowerCase()}`} />
          </div>

          <div>
            <Label className="text-xs">URL Gambar</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 h-9 text-xs" placeholder="https://..." />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={hasVariants} onCheckedChange={setHasVariants} id="has-variants" />
            <Label htmlFor="has-variants" className="text-xs">Aktifkan Variasi</Label>
          </div>

          {!hasVariants ? (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-xs">Stok Awal</Label>
              <Input type="number" value={variants[0]?.initialStock ?? 0} onChange={(e) => updateVariant(0, "initialStock", Number(e.target.value))} className="h-9 text-xs" />
              <div>
                <Label className="text-xs">URL Gambar Varian</Label>
                <Input value={variants[0]?.imageUrl ?? ""} onChange={(e) => updateVariant(0, "imageUrl", e.target.value)} className="mt-1 h-9 text-xs" placeholder="Opsional, override gambar produk" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Harga Modal</Label>
                  <Input type="number" value={variants[0]?.costPrice ?? 0} onChange={(e) => updateVariant(0, "costPrice", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Harga Jual</Label>
                  <Input type="number" value={variants[0]?.sellingPrice ?? 0} onChange={(e) => updateVariant(0, "sellingPrice", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">Varian {i + 1}</span>
                    {variants.length > 1 && (
                      <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeVariant(i)}>✕</Button>
                    )}
                  </div>
                  <Input value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)} className="h-9 text-xs" placeholder="Nama variasi (contoh: Black / 128GB)" />
                  <div>
                    <Label className="text-xs">URL Gambar Varian</Label>
                    <Input value={v.imageUrl ?? ""} onChange={(e) => updateVariant(i, "imageUrl", e.target.value)} className="mt-1 h-9 text-xs" placeholder="Opsional, override gambar produk" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Stok Awal</Label>
                      <Input type="number" value={v.initialStock ?? 0} onChange={(e) => updateVariant(i, "initialStock", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">SKU</Label>
                      <Input value={v.sku ?? ""} onChange={(e) => updateVariant(i, "sku", e.target.value)} className="mt-1 h-9 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Harga Modal</Label>
                      <Input type="number" value={v.costPrice ?? 0} onChange={(e) => updateVariant(i, "costPrice", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Harga Jual</Label>
                      <Input type="number" value={v.sellingPrice ?? 0} onChange={(e) => updateVariant(i, "sellingPrice", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={addVariant}>
                <Plus className="mr-1 size-3" /> Tambah Varian
              </Button>
            </div>
          )}

          <Button className="h-9 w-full text-xs" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            {saving ? "Menyimpan..." : `Simpan ${label}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════ UNIT SECOND FORM ═══════════════════════ */

/* ═══════════════════════ STOCK OPNAME ═══════════════════════ */

function StockOpnameDialog({
  open, onOpenChange, brandSlug, branchId, onSuccess, categories,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  brandSlug: string; branchId: string; onSuccess: () => void;
  categories: CategoryV4Row[];
}) {
  const [tab, setTab] = React.useState<"SPAREPART" | "PRODUCT" | "UNIT">("SPAREPART");
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("**ALL_CATEGORIES**");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<{ data: StockOpnameVariantRow[]; total: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [adjustments, setAdjustments] = React.useState<Record<string, number | null>>({});
  const [saving, setSaving] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1;

  const fetchVariants = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const res = await listStockOpnameVariantsV4Action(brandSlug, {
      branchId,
      productKind: tab,
      categoryId: categoryId === "**ALL_CATEGORIES**" ? null : categoryId,
      search: search || undefined,
      page,
      pageSize: 25,
    });
    if (res.success) setData(res.data);
    setLoading(false);
  }, [brandSlug, branchId, tab, categoryId, search, page]);

  React.useEffect(() => { if (open) fetchVariants(); }, [open, fetchVariants]);
  React.useEffect(() => { setPage(1); }, [search, categoryId, tab]);

  const handlePhysicalChange = (variantId: string, value: string) => {
    const num = value === "" ? null : Number(value);
    setAdjustments((prev) => ({ ...prev, [variantId]: num }));
  };

  const getDiff = (row: StockOpnameVariantRow) => {
    const physical = adjustments[row.variantId];
    if (physical === null || physical === undefined) return null;
    return physical - row.currentStock;
  };

  const changedEntries = React.useMemo(() => {
    if (!data) return [];
    return data.data.filter((row) => {
      const diff = getDiff(row);
      return diff !== null && diff !== 0;
    });
  }, [data, adjustments]);

  const hasChanges = changedEntries.length > 0;

  const handlePreview = () => {
    if (!notes.trim()) { triggerDynamicIslandFeedback({ title: "Catatan/alasan penyesuaian wajib diisi.", type: "error" }); return; }
    if (!hasChanges) { triggerDynamicIslandFeedback({ title: "Tidak ada perubahan untuk disimpan.", type: "error" }); return; }
    setPreviewOpen(true);
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    triggerDynamicIslandFeedback({ title: "Menyimpan penyesuaian stok...", type: "loading" });
    try {
      const res = await submitStockOpnameV4Action(brandSlug, {
        branchId,
        notes: notes.trim(),
        adjustments: changedEntries.map((row) => ({
          variantId: row.variantId,
          physicalStock: adjustments[row.variantId]!,
        })),
      });
      if (res.success) {
        const r = res.data as any;
        triggerDynamicIslandFeedback({ title: `Penyesuaian stok berhasil (${r.adjustedCount} item diperbarui)`, type: "success" });
        setPreviewOpen(false);
        setAdjustments({});
        setNotes("");
        fetchVariants();
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({ title: res.error || "Gagal menyimpan penyesuaian stok.", type: "error" });
      }
    } catch (err: any) {
      triggerDynamicIslandFeedback({ title: err.message || "Terjadi kesalahan", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = React.useMemo(
    () => categories.filter((c) => c.itemType === (tab === "SPAREPART" ? "SPAREPART" : tab === "PRODUCT" ? "PRODUCT" : "DEVICE_UNIT")),
    [categories, tab],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok</DialogTitle>
            <DialogDescription>
              Cocokkan stok fisik dengan stok sistem. Setiap perubahan akan dicatat di Movement Stok.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="SPAREPART" className="text-xs">Sparepart</TabsTrigger>
                <TabsTrigger value="PRODUCT" className="text-xs">Produk</TabsTrigger>
                <TabsTrigger value="UNIT" className="text-xs">Unit Baru</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="rounded-lg border bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="mr-1 inline size-3.5 text-amber-500" />
              Stok Unit Second dikelola per IMEI/unit. Gunakan tab Unit Second untuk mengubah status atau menambah unit.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cari nama/SKU/barcode..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="h-9 w-full max-w-xs pl-8 text-xs" />
              </div>
              {filteredCategories.length > 0 && (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="**ALL_CATEGORIES**" className="text-xs">Semua kategori</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <div className="grid grid-cols-[130px_80px_70px_80px_80px_50px] sm:grid-cols-[2fr_1fr_80px_100px_100px_50px] gap-1 border-b bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>Item</span><span>Kategori</span><span>Stok Sistem</span><span>Stok Opname</span><span>Selisih</span><span></span>
              </div>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : data && data.data.length > 0 ? data.data.map((row) => {
                const diff = getDiff(row);
                const physical = adjustments[row.variantId];
                const isChanged = diff !== null && diff !== 0;
                return (
                  <div key={row.variantId} className="grid grid-cols-[130px_80px_70px_80px_80px_50px] sm:grid-cols-[2fr_1fr_80px_100px_100px_50px] gap-1 border-b px-3 py-2 text-xs last:border-0 hover:bg-muted/10">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.productName}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{formatVariantAttributes(row.attributes)}</p>
                      {row.sku && <p className="text-[9px] text-muted-foreground">SKU: {row.sku}</p>}
                    </div>
                    <div className="flex items-center text-[10px] text-muted-foreground">{row.categoryName ?? "—"}</div>
                    <div className="flex items-center tabular-nums">{row.currentStock}</div>
                    <div className="flex items-center">
                      <Input type="number" value={physical ?? ""} placeholder={String(row.currentStock)}
                        onChange={(e) => handlePhysicalChange(row.variantId, e.target.value)}
                        className={`h-8 w-full text-xs ${isChanged ? "border-amber-400 bg-amber-50" : ""}`} min={0} />
                    </div>
                    <div className="flex items-center tabular-nums text-xs">
                      {diff === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : diff > 0 ? (
                        <span className="text-emerald-600">+{diff}</span>
                      ) : diff < 0 ? (
                        <span className="text-red-600">{diff}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {isChanged && <Badge variant="outline" className="h-5 rounded-full px-2 text-[9px] text-amber-600 border-amber-300">Ubah</Badge>}
                    </div>
                  </div>
                );
              }) : (
                <div className="flex justify-center py-12 text-xs text-muted-foreground">Tidak ada data</div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="icon" className="size-7" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="size-7" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-xs">Catatan / Alasan *</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="text-xs" rows={2} placeholder="Contoh: Opname bulan Juni 2026" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="h-9 flex-1 text-xs" onClick={() => onOpenChange(false)}>Tutup</Button>
              <Button className="h-9 flex-1 text-xs" onClick={handlePreview} disabled={!hasChanges || !notes.trim() || saving}>
                <ClipboardList className="mr-1 size-3.5" /> Preview & Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Penyesuaian Stok</DialogTitle>
            <DialogDescription>Periksa kembali perubahan sebelum disimpan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
              Catatan: {notes}
            </div>

            <div className="rounded-lg border">
              <div className="grid grid-cols-[2fr_60px_70px_60px_70px] gap-1 border-b bg-muted/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
                <span>Item</span><span>Sistem</span><span>Opname</span><span>Selisih</span><span>Movement</span>
              </div>
              {changedEntries.map((row) => {
                const diff = getDiff(row)!;
                return (
                  <div key={row.variantId} className="grid grid-cols-[2fr_60px_70px_60px_70px] gap-1 border-b px-2 py-1.5 text-[10px] last:border-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.productName}</p>
                      <p className="truncate text-muted-foreground">{formatVariantAttributes(row.attributes)}</p>
                    </div>
                    <div className="flex items-center tabular-nums">{row.currentStock}</div>
                    <div className="flex items-center tabular-nums">{adjustments[row.variantId]}</div>
                    <div className="flex items-center tabular-nums">
                      {diff > 0 ? <span className="text-emerald-600">+{diff}</span> : <span className="text-red-600">{diff}</span>}
                    </div>
                    <div className="flex items-center text-[9px]">
                      <Badge variant={diff > 0 ? "default" : "destructive"} className="h-5 rounded-full px-2 text-[9px] font-normal">
                        {diff > 0 ? "Opname Masuk" : "Opname Keluar"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="h-9 flex-1 text-xs" onClick={() => setPreviewOpen(false)}>Kembali</Button>
              <Button className="h-9 flex-1 text-xs" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
                {saving ? "Menyimpan..." : "Konfirmasi Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════════ BELANJA STOK ═══════════════════════ */

function BelanjaStokDialog({
  brandSlug, branchId, onSuccess,
}: {
  brandSlug: string; branchId: string; onSuccess: () => void;
}) {
  const { isExpanded, collapse } = useExpandableScreen();
  const [step, setStep] = React.useState<"form" | "preview">("form");
  const [saving, setSaving] = React.useState(false);
  const [supplierName, setSupplierName] = React.useState("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [paymentAccountId, setPaymentAccountId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<PurchaseVariantSearchRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [items, setItems] = React.useState<(PurchaseVariantSearchRow & { quantity: number; unitCost: number; unitSellingPrice: number; note: string })[]>([]);
  const [paymentAccounts, setPaymentAccounts] = React.useState<{ id: string; name: string; balance: number }[]>([]);

  React.useEffect(() => {
    if (!isExpanded) return;
    setStep("form");
    setSaving(false);
    setSupplierName("");
    setInvoiceNumber("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPaymentAccountId("");
    setNotes("");
    setSearchTerm("");
    setSearchResults([]);
    setItems([]);
    setPaymentAccounts([]);
  }, [isExpanded]);

  const fetchPaymentAccounts = React.useCallback(async () => {
    try {
      const mod = await import("@/server/actions/inventory.actions");
      const res = await mod.getPaymentAccountsForPurchaseAction(brandSlug, branchId || undefined);
      if (res.success) setPaymentAccounts(res.data ?? []);
    } catch {}
  }, [brandSlug, branchId]);

  React.useEffect(() => { if (isExpanded) fetchPaymentAccounts(); }, [isExpanded, fetchPaymentAccounts]);

  const doSearch = React.useCallback(async (term: string) => {
    if (!term.trim() || !branchId) { setSearchResults([]); return; }
    setSearching(true);
    const res = await searchPurchaseVariantsV4Action(brandSlug, branchId, term);
    if (res.success) setSearchResults(res.data ?? []);
    setSearching(false);
  }, [brandSlug, branchId]);

  const handleAddItem = (variant: PurchaseVariantSearchRow) => {
    if (items.some((i) => i.variantId === variant.variantId)) return;
    setItems((prev) => [...prev, { ...variant, quantity: 1, unitCost: variant.costPrice, unitSellingPrice: variant.sellingPrice, note: "" }]);
    setSearchTerm("");
    setSearchResults([]);
  };

  const updateItem = (i: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      (next[i] as any)[field] = value;
      return next;
    });
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const handlePreview = () => {
    if (!paymentAccountId) { triggerDynamicIslandFeedback({ title: "Akun pembayaran wajib dipilih", type: "error" }); return; }
    if (items.length === 0) { triggerDynamicIslandFeedback({ title: "Minimal satu item harus ditambahkan", type: "error" }); return; }
    for (const item of items) {
      if (item.quantity <= 0) { triggerDynamicIslandFeedback({ title: "Jumlah beli harus lebih dari 0", type: "error" }); return; }
      if (item.unitCost < 0) { triggerDynamicIslandFeedback({ title: "Harga modal tidak boleh negatif", type: "error" }); return; }
    }
    setStep("preview");
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    triggerDynamicIslandFeedback({ title: "Mencatat belanja stok...", type: "loading" });
    try {
      const input: CreateStockPurchaseV4Input = {
        branchId,
        paymentAccountId,
        supplierName: supplierName || null,
        purchaseDate,
        notes: notes || null,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitSellingPrice: item.unitSellingPrice || null,
          note: item.note || null,
        })),
      };
      const res = await createStockPurchaseV4Action(brandSlug, input);
      if (res.success) {
        const data = res.data as any;
        triggerDynamicIslandFeedback({ title: `Belanja stok berhasil: ${data.purchaseNumber}`, type: "success" });
        collapse();
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({ title: res.error || "Gagal mencatat belanja stok", type: "error" });
      }
    } catch (err: any) {
      triggerDynamicIslandFeedback({ title: err.message || "Terjadi kesalahan", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const payAccMap = React.useMemo(() => {
    const m = new Map(paymentAccounts.map((a) => [a.id, a]));
    return m;
  }, [paymentAccounts]);

  return (
    <ExpandableScreenContent
      className="bg-card text-card-foreground"
      closeButtonClassName="text-muted-foreground hover:bg-muted"
    >
      {step === "form" ? (
        <div className="flex w-full flex-col gap-4 p-4 sm:p-6 lg:h-[calc(90dvh)] lg:flex-row lg:gap-0 lg:overflow-hidden">
          {/* LEFT: cari item + informasi belanja */}
          <div className="flex w-full flex-col gap-4 lg:h-full lg:w-[46%] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:pr-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Belanja Stok</h2>
              <p className="text-xs text-muted-foreground">Catat pembelian stok untuk Sparepart, Produk, atau Unit Baru.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Tanggal Belanja</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Akun Pembayaran *</Label>
                <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                  <SelectContent className="z-[10010]">
                    {paymentAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">{a.name} — Rp {a.balance.toLocaleString("id-ID")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Supplier (opsional)</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="mt-1 h-9 text-xs" placeholder="Nama supplier" />
              </div>
              <div>
                <Label className="text-xs">No. Invoice Supplier (opsional)</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="mt-1 h-9 text-xs" placeholder="INV-001" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Catatan (opsional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 text-xs" rows={2} placeholder="Catatan belanja" />
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Cari Item (Sparepart / Produk / Unit Baru)</Label>
              <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); doSearch(e.target.value); }}
                className="mt-1 h-9 text-xs" placeholder="Cari nama varian, SKU, atau barcode..." autoFocus />
              {searching && <div className="flex items-center gap-1 py-1 text-[10px] text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Mencari...</div>}
              {searchResults.length > 0 && (
                <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border lg:max-h-none">
                  {searchResults.map((v) => (
                    <button key={v.variantId} onClick={() => handleAddItem(v)}
                      className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-xs transition-colors last:border-0 hover:bg-muted/30">
                      <Plus className="size-3 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{v.productName} — {v.variantName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {productKindLabel(v.productKind, v.conditionType)} &middot; SKU: {v.sku ?? "—"} &middot; Stok: {v.currentStock}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: item list */}
          <div className="flex w-full flex-col gap-4 lg:h-full lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pl-6">
            <div className="space-y-1">
              <p className="text-xs font-medium">Items Selected ({items.length})</p>
              {items.length > 0 ? (
                <>
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-[1.3fr_36px_64px_80px_80px_28px] gap-1 border-b bg-muted/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
                      <span>Item</span><span>Stok</span><span>Qty Beli</span><span>Harga Modal</span><span>Subtotal</span><span></span>
                    </div>
                    {items.map((item, i) => (
                      <div key={item.variantId} className="grid grid-cols-[1.3fr_36px_64px_80px_80px_28px] gap-1 border-b px-2 py-1.5 text-[10px] last:border-0">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.productName}</p>
                          <p className="truncate text-muted-foreground">{item.variantName}</p>
                        </div>
                        <div className="flex items-center tabular-nums">{item.currentStock}</div>
                        <div className="flex items-center">
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                            className="h-7 w-full text-[10px]" min={1} />
                        </div>
                        <div className="flex items-center">
                          <Input type="number" value={item.unitCost} onChange={(e) => updateItem(i, "unitCost", Number(e.target.value))}
                            className="h-7 w-full text-[10px]" min={0} />
                        </div>
                        <div className="flex items-center tabular-nums">{(item.quantity * item.unitCost).toLocaleString("id-ID")}</div>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeItem(i)}>
                            <XCircle className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs text-muted-foreground">Total: {items.length} item</span>
                    <span className="text-xs font-semibold tabular-nums">Rp {totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada item. Cari dan pilih item di panel kiri.</p>
              )}
            </div>

            <div className="flex gap-2 lg:mt-auto lg:pt-2">
              <Button variant="outline" className="h-9 flex-1 text-xs" onClick={() => collapse()}>Batal</Button>
              <Button className="h-9 flex-1 text-xs" onClick={handlePreview} disabled={items.length === 0 || !paymentAccountId}>
                Preview & Konfirmasi
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">Preview Belanja Stok</h2>
          <p className="mb-3 text-xs text-muted-foreground">Periksa kembali sebelum menyimpan.</p>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Supplier:</span> {supplierName || "—"}</div>
                <div><span className="text-muted-foreground">Akun:</span> {payAccMap.get(paymentAccountId)?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Tanggal:</span> {purchaseDate}</div>
                <div><span className="text-muted-foreground">Total:</span> <strong>Rp {totalAmount.toLocaleString("id-ID")}</strong></div>
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="grid grid-cols-[2fr_60px_60px_70px_70px] gap-1 border-b bg-muted/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
                <span>Item</span><span>Stok Skrg</span><span>Qty Masuk</span><span>Stok Stlh</span><span>Subtotal</span>
              </div>
              {items.map((item) => (
                <div key={item.variantId} className="grid grid-cols-[2fr_60px_60px_70px_70px] gap-1 border-b px-2 py-1.5 text-[10px] last:border-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="truncate text-muted-foreground">{item.variantName}</p>
                  </div>
                  <div className="flex items-center tabular-nums">{item.currentStock}</div>
                  <div className="flex items-center tabular-nums">{item.quantity}</div>
                  <div className="flex items-center tabular-nums">{item.currentStock + item.quantity}</div>
                  <div className="flex items-center tabular-nums">{(item.quantity * item.unitCost).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="h-9 flex-1 text-xs" onClick={() => setStep("form")}>Kembali</Button>
              <Button className="h-9 flex-1 text-xs" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
                {saving ? "Menyimpan..." : "Konfirmasi Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ExpandableScreenContent>
  );
}

/* ═══════════════════════ PURCHASE HISTORY TAB ═══════════════════════ */

function PurchaseHistoryTab({
  brandSlug, activeBranchId, refreshKey, branchMap,
}: {
  brandSlug: string; activeBranchId: string | null; refreshKey: number; branchMap: Map<string, string>;
}) {
  const [purchases, setPurchases] = React.useState<{ data: StockPurchaseV4Row[]; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailPurchase, setDetailPurchase] = React.useState<StockPurchaseV4Row | null>(null);
  const [detailItems, setDetailItems] = React.useState<StockPurchaseItemV4Row[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const totalPages = purchases ? Math.max(1, Math.ceil(purchases.total / MAX_PAGE)) : 1;

  React.useEffect(() => {
    setLoading(true);
    listStockPurchasesV4Action(brandSlug, {
      branchId: activeBranchId,
      page,
      pageSize: MAX_PAGE,
      search: search || undefined,
    }).then((res) => {
      if (res.success) setPurchases(res.data);
      setLoading(false);
    });
  }, [activeBranchId, brandSlug, page, search, refreshKey]);

  React.useEffect(() => { setPage(1); }, [search]);

  const handleDetail = async (p: StockPurchaseV4Row) => {
    setDetailOpen(true);
    setDetailPurchase(p);
    setDetailLoading(true);
    const res = await getStockPurchaseDetailV4Action(brandSlug, p.id);
    if (res.success) setDetailItems(res.data ?? []);
    setDetailLoading(false);
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nomor PO / supplier..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-xs pl-8 text-xs" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2.5">Tanggal</th>
              <th className="px-3 py-2.5">Nomor</th>
              <th className="px-3 py-2.5">Supplier</th>
              <th className="px-3 py-2.5">Total</th>
              <th className="px-3 py-2.5">Akun</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></td></tr>
            ) : purchases && purchases.data.length > 0 ? purchases.data.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5">{new Date(p.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td>
                <td className="px-3 py-2.5 font-mono font-medium text-primary">{p.purchaseNumber}</td>
                <td className="px-3 py-2.5">{p.supplierName || "—"}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatRp(p.totalAmount)}</td>
                <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{p.paymentAccountName || "—"}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="default" className="h-5 rounded-full px-2 text-[10px] font-normal">
                    {p.status === "COMPLETED" ? "Selesai" : p.status}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDetail(p)}>
                    <Eye className="size-3.5" />
                  </Button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">Belum ada riwayat belanja</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailPurchase?.purchaseNumber ?? "Detail Belanja"}</DialogTitle>
            <DialogDescription>
              {detailPurchase?.supplierName ? `Supplier: ${detailPurchase.supplierName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {detailItems.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium">{item.productNameSnapshot}</p>
                      <p className="text-[10px] text-muted-foreground">{item.variantNameSnapshot || "—"}</p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{formatRp(item.subtotalAmount)}</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                    <span>{item.quantity} {item.unitSnapshot} × Rp {item.unitCost.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-xs font-medium">Total</span>
                <span className="text-xs font-semibold tabular-nums">{formatRp(detailPurchase?.totalAmount ?? 0)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════════ UNIT SECOND FORM ═══════════════════════ */

function UnitSecondFormDialog({
  open, onOpenChange, brandSlug, branchId, onSuccess, categories,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  brandSlug: string; branchId: string; onSuccess: () => void;
  categories: CategoryV4Row[];
}) {
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [catOptions, setCatOptions] = React.useState<CategoryV4Row[]>([]);
  const [existingProductId, setExistingProductId] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<Array<{ productId: string; name: string; categoryName: string | null; readyCount: number }>>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [units, setUnits] = React.useState<CreateUnitSecondRowInput[]>([
    { unitAttributes: {}, batteryHealth: null, imei: "", serialNumber: "", barcode: "", purchaseCost: 0, sellingPrice: 0, status: "READY_STOCK" },
  ]);

  const searchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setCategoryId("");
    setCatOptions(categories.filter((c) => c.itemType === "DEVICE_UNIT"));
    listCategoriesV4Action(brandSlug, "DEVICE_UNIT").then((res) => {
      if (res.success && res.data) setCatOptions(res.data);
    });
  }, [open, brandSlug, categories]);

  const reset = () => {
    setName("");
    setImageUrl("");
    setCategoryId("");
    setExistingProductId(null);
    setSearchResults([]);
    setSearchOpen(false);
    setUnits([{ unitAttributes: {}, batteryHealth: null, imei: "", serialNumber: "", barcode: "", purchaseCost: 0, sellingPrice: 0, status: "READY_STOCK" }]);
  };

  // Debounced model search
  React.useEffect(() => {
    if (!name.trim() || existingProductId) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchUnitSecondModelsV4Action(brandSlug, branchId, name.trim());
        if (res.success) {
          const results = res.data ?? [];
          setSearchResults(results);
          setSearchOpen(results.length > 0);
        }
      } catch { /* ignore */ } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [name, existingProductId, brandSlug, branchId]);

  // Close search on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectExisting = (item: { productId: string; name: string }) => {
    setName(item.name);
    setExistingProductId(item.productId);
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (existingProductId && value.trim().toLowerCase() !== name.trim().toLowerCase()) {
      setExistingProductId(null);
    }
  };

  const updateUnit = (i: number, field: keyof CreateUnitSecondRowInput, value: any) => {
    setUnits((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addUnit = () => {
    setUnits((prev) => [...prev, { unitAttributes: {}, batteryHealth: null, imei: "", serialNumber: "", barcode: "", purchaseCost: 0, sellingPrice: 0, status: "READY_STOCK" }]);
  };

  const removeUnit = (i: number) => {
    setUnits((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!name.trim() || units.length === 0 || saving) return;
    for (const u of units) {
      if (u.batteryHealth !== null && u.batteryHealth !== undefined && (u.batteryHealth < 0 || u.batteryHealth > 100)) {
        triggerDynamicIslandFeedback({ title: "Battery health harus antara 0-100", type: "error" });
        return;
      }
    }
    setSaving(true);
    try {
      const res = await createUnitSecondV4Action(brandSlug, {
        brandId: 0,
        branchId,
        existingProductId: existingProductId || null,
        name: name.trim(),
        imageUrl: imageUrl.trim() || null,
        categoryId: categoryId || null,
        units: units.map((u) => ({
          ...u,
          imei: u.imei || null,
          serialNumber: u.serialNumber || null,
          barcode: u.barcode || null,
        })),
      });
      if (res.success) {
        triggerDynamicIslandFeedback({ title: "Unit second berhasil ditambahkan", type: "success" });
        onOpenChange(false);
        reset();
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({ title: res.error || "Gagal menambahkan unit second", type: "error" });
      }
    } catch (err: any) {
      triggerDynamicIslandFeedback({ title: err.message || "Terjadi kesalahan", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Unit Second</DialogTitle>
          <DialogDescription>Isi detail unit second beserta unit-unitnya.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Kategori · Unit Second</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Pilih kategori (opsional)" /></SelectTrigger>
              <SelectContent>
                {catOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div ref={searchRef} className="relative">
            <Label className="text-xs">Nama Unit / Model</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} className="mt-1 h-9 text-xs" placeholder="Contoh: iPhone 16 Pro Max" />
            {searchLoading && (
              <Loader2 className="absolute right-2 top-1/2 size-3.5 animate-spin text-muted-foreground translate-y-0.5" />
            )}
            {searchOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
                {searchResults.length === 0 && (
                  <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">Tidak ada model ditemukan</div>
                )}
                {searchResults.map((item) => (
                  <button
                    key={item.productId}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                    onClick={() => handleSelectExisting(item)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.readyCount} ready{item.categoryName ? ` · ${item.categoryName}` : ""} · Model existing
                      </span>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">Existing</Badge>
                  </button>
                ))}
              </div>
            )}
            {existingProductId && (
              <Badge variant="secondary" className="mt-1 text-[10px]">Menggunakan model existing</Badge>
            )}
          </div>

          <div>
            <Label className="text-xs">URL Gambar Model</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 h-9 text-xs" placeholder="https://..." />
          </div>

          <Separator />

          <div className="space-y-3">
            {units.map((u, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">Unit {i + 1}</span>
                  {units.length > 1 && (
                    <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeUnit(i)}>✕</Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <Input value={(u.unitAttributes as any)?.Warna ?? ""}
                      onChange={(e) => updateUnit(i, "unitAttributes", { ...(u.unitAttributes as any ?? {}), Warna: e.target.value })}
                      className="mt-1 h-9 text-xs" placeholder="Desert" />
                  </div>
                  <div>
                    <Label className="text-xs">Storage</Label>
                    <Input value={(u.unitAttributes as any)?.Storage ?? ""}
                      onChange={(e) => updateUnit(i, "unitAttributes", { ...(u.unitAttributes as any ?? {}), Storage: e.target.value })}
                      className="mt-1 h-9 text-xs" placeholder="256GB" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">URL Gambar Unit</Label>
                  <Input value={u.imageUrl ?? ""} onChange={(e) => updateUnit(i, "imageUrl", e.target.value)} className="mt-1 h-9 text-xs" placeholder="Opsional, foto unit fisik" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Battery Health</Label>
                    <Input type="number" value={u.batteryHealth ?? ""} onChange={(e) => updateUnit(i, "batteryHealth", e.target.value ? Number(e.target.value) : null)} className="mt-1 h-9 text-xs" placeholder="92" />
                  </div>
                  <div>
                    <Label className="text-xs">IMEI</Label>
                    <Input value={u.imei ?? ""} onChange={(e) => updateUnit(i, "imei", e.target.value)} className="mt-1 h-9 text-xs font-mono" placeholder="IMEI" />
                  </div>
                  <div>
                    <Label className="text-xs">Serial</Label>
                    <Input value={u.serialNumber ?? ""} onChange={(e) => updateUnit(i, "serialNumber", e.target.value)} className="mt-1 h-9 text-xs" placeholder="Serial" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Harga Modal</Label>
                    <Input type="number" value={u.purchaseCost ?? 0} onChange={(e) => updateUnit(i, "purchaseCost", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Harga Jual / Nett</Label>
                    <Input type="number" value={u.sellingPrice ?? 0} onChange={(e) => updateUnit(i, "sellingPrice", Number(e.target.value))} className="mt-1 h-9 text-xs" />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={addUnit}>
              <Plus className="mr-1 size-3" /> Tambah Unit
            </Button>
          </div>

          <Button className="h-9 w-full text-xs" onClick={handleSave} disabled={saving || !name.trim() || units.length === 0}>
            {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Simpan Unit Second"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
