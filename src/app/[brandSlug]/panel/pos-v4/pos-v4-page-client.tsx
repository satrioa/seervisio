"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Search, Plus, Minus, X, Loader2, ShoppingCart, CreditCard,
  Smartphone, Package, ChevronDown, ChevronUp, Wifi, Banknote,
  QrCode, Receipt, Eye, AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardImage,
  MinimalCardTitle,
} from "@/components/ui/minimal-card";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

import {
  listPosProductsV4Action,
  listPosUnitOptionsV4Action,
  checkoutPosV4Action,
  listPosTransactionsV4Action,
  getPosTransactionDetailV4Action,
  listPosCategoriesV4Action,
  listPosPaymentMethodsV4Action,
  voidPosTransactionV4Action,
} from "@/server/actions/inventory-v4.actions";
import type {
  PosProductV4Row,
  PosVariantV4Row,
  PosUnitSecondOptionV4Row,
  PosCartItemV4,
  CheckoutPosV4Input,
  CheckoutPosV4Result,
  PosTransactionV4Row,
  PosTransactionItemV4Row,
  VoidPosTransactionV4Result,
} from "@/server/domain/inventory-v4.types";

/* ─── Helpers ─── */

function formatPrice(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function getDisplayImage(product: PosProductV4Row, variant?: PosVariantV4Row) {
  return variant?.imageUrl ?? product.imageUrl ?? null;
}

function stockBadge(variant: PosVariantV4Row, isUnitSecond: boolean) {
  if (isUnitSecond) {
    return { label: `${variant.currentStock} ready`, className: "border-blue-200 bg-blue-50 text-blue-700" };
  }
  if (variant.currentStock <= 0) return { label: "Habis", className: "border-red-200 bg-red-50 text-red-700" };
  if (variant.minStock > 0 && variant.currentStock <= variant.minStock) return { label: "Menipis", className: "border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "Ready", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function ProductImageFrame({
  src,
  name,
  isUnit,
}: {
  src: string | null;
  name: string;
  isUnit: boolean;
}) {
  if (src) {
    return <MinimalCardImage src={src} alt={name} className="mb-3 h-28 sm:h-32" />;
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="mb-3 flex h-28 w-full items-center justify-center rounded-[20px] border bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-inner sm:h-32">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        {isUnit ? <Smartphone className="size-7" /> : <Package className="size-7" />}
        <span className="text-sm font-semibold tracking-wide text-slate-500">{initials || "IV"}</span>
      </div>
    </div>
  );
}

function shouldShowVariant(name: string, variant?: string | null) {
  if (!variant) return false;
  return variant.trim().toLowerCase() !== name.trim().toLowerCase();
}

function getSerializedMetaBadges(item: PosCartItemV4) {
  const badges: string[] = [];

  if (item.imeiSnapshot) badges.push(`IMEI ${item.imeiSnapshot}`);
  if (item.serialNumberSnapshot) badges.push(`SN ${item.serialNumberSnapshot}`);
  if (item.batteryHealthSnapshot !== null) badges.push(`BH ${item.batteryHealthSnapshot}%`);

  if (item.attributesSnapshot) {
    Object.entries(item.attributesSnapshot)
      .filter(([k]) => {
        const kl = k.toLowerCase();
        return kl === "warna" || kl === "storage" || kl === "color";
      })
      .forEach(([_, value]) => {
        badges.push(String(value));
      });
  }

  return badges;
}

interface PaymentMethodOption {
  branchPaymentMethodId: string;
  methodType: string;
  paymentAccountId: string | null;
  mdrPercentage: number | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  paymentMethodType: string;
  defaultPaymentAccountId: string | null;
}

/* ─── Main Component ─── */

interface PosV4PageClientProps {
  brandSlug: string;
}

export function PosV4PageClient({ brandSlug }: PosV4PageClientProps) {
  const { activeBranchId, userRole } = useActiveBranch();
  const canManage = can(userRole as any, PERMISSIONS.INVENTORY_MANAGE);

  /* ── Products ── */
  const [products, setProducts] = React.useState<PosProductV4Row[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);
  const [unitOptions, setUnitOptions] = React.useState<PosUnitSecondOptionV4Row[]>([]);
  const [unitPickerOpen, setUnitPickerOpen] = React.useState(false);
  const [unitPickerProductName, setUnitPickerProductName] = React.useState("");

  /* ── Cart ── */
  const [cart, setCart] = React.useState<PosCartItemV4[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [serviceFeeAmount, setServiceFeeAmount] = React.useState(0);

  /* ── Payment ── */
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethodOption[]>([]);
  const [selectedMethod, setSelectedMethod] = React.useState<string>("");
  const [paidAmount, setPaidAmount] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  /* ── History ── */
  const [transactions, setTransactions] = React.useState<PosTransactionV4Row[]>([]);
  const [txLoading, setTxLoading] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailItems, setDetailItems] = React.useState<PosTransactionItemV4Row[]>([]);
  const [detailTx, setDetailTx] = React.useState<PosTransactionV4Row | null>(null);

  /* ── Void ── */
  const [voidOpen, setVoidOpen] = React.useState(false);
  const [voidReason, setVoidReason] = React.useState("");
  const [voidSaving, setVoidSaving] = React.useState(false);
  const canVoid = can(userRole as any, PERMISSIONS.POS_VOID);

  const refreshKeyRef = React.useRef(0);
  const searchTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  /* ── Data Fetching ── */

  const fetchProducts = React.useCallback(async (categoryId?: string | null, search?: string) => {
    if (!activeBranchId) return;
    setProductsLoading(true);
    const res = await listPosProductsV4Action(brandSlug, activeBranchId, categoryId, search || undefined);
    if (res.success) setProducts(res.data ?? []);
    setProductsLoading(false);
  }, [brandSlug, activeBranchId]);

  const fetchCategories = React.useCallback(async () => {
    const res = await listPosCategoriesV4Action(brandSlug);
    if (res.success) setCategories(res.data ?? []);
  }, [brandSlug]);

  const fetchPaymentMethods = React.useCallback(async () => {
    if (!activeBranchId) return;
    const res = await listPosPaymentMethodsV4Action(brandSlug, activeBranchId);
    if (res.success) setPaymentMethods(res.data ?? []);
  }, [brandSlug, activeBranchId]);

  const fetchTransactions = React.useCallback(async () => {
    if (!activeBranchId) return;
    setTxLoading(true);
    const res = await listPosTransactionsV4Action(brandSlug, activeBranchId, 1);
    if (res.success) {
      const r = res.data as any;
      setTransactions(r.data ?? []);
    }
    setTxLoading(false);
  }, [brandSlug, activeBranchId]);

  React.useEffect(() => {
    if (!activeBranchId) return;
    fetchCategories();
    fetchPaymentMethods();
    fetchProducts(null, "");
    fetchTransactions();
  }, [activeBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = React.useCallback(() => {
    if (!activeBranchId) return;
    refreshKeyRef.current++;
    fetchProducts(activeCategory, searchTerm);
    fetchTransactions();
  }, [fetchProducts, fetchTransactions, activeCategory, searchTerm, activeBranchId]);

  const handleSearch = React.useCallback((val: string) => {
    setSearchTerm(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchProducts(activeCategory, val);
    }, 300);
  }, [fetchProducts, activeCategory]);

  const handleCategoryChange = React.useCallback((catId: string | null) => {
    setActiveCategory(catId);
    fetchProducts(catId, searchTerm);
  }, [fetchProducts, searchTerm]);

  /* ── Unit Second Picker ── */

  const openUnitPicker = React.useCallback(async (productId: string, productName: string) => {
    if (!activeBranchId) return;
    setUnitPickerProductName(productName);
    setUnitPickerOpen(true);
    const res = await listPosUnitOptionsV4Action(brandSlug, productId, activeBranchId);
    if (res.success) setUnitOptions(res.data ?? []);
  }, [brandSlug, activeBranchId]);

  const addUnitToCart = React.useCallback((unit: PosUnitSecondOptionV4Row) => {
    if (cart.some((c) => c.unitId === unit.unitId)) {
      triggerDynamicIslandFeedback({ title: "Unit sudah ada di keranjang.", type: "error" });
      return;
    }
    const product = products.find((p) => p.productId === unit.productId);
    const variant = unit.variantId ? product?.variants.find((v) => v.variantId === unit.variantId) : null;
    const newItem: PosCartItemV4 = {
      tempId: crypto.randomUUID(),
      type: "UNIT_SECOND_SERIALIZED",
      productId: unit.productId,
      variantId: unit.variantId,
      unitId: unit.unitId,
      nameSnapshot: product?.name ?? "",
      variantSnapshot: unit.variantName ?? variant?.variantName ?? null,
      attributesSnapshot: unit.unitAttributes ?? null,
      imeiSnapshot: unit.imei ?? null,
      serialNumberSnapshot: unit.serialNumber ?? null,
      batteryHealthSnapshot: unit.batteryHealth ?? null,
      conditionSnapshot: unit.conditionGrade ?? null,
      quantity: 1,
      stockAvailable: 1,
      price: unit.sellingPrice,
      costSnapshot: unit.purchaseCost,
    };
    setCart((prev) => [...prev, newItem]);
    setUnitPickerOpen(false);
  }, [cart, products]);

  /* ── Cart Actions ── */

  const addVariantToCart = React.useCallback((product: PosProductV4Row, variant: PosVariantV4Row) => {
    if (product.conditionType === "SECOND") {
      openUnitPicker(product.productId, product.name);
      return;
    }
    const existing = cart.find((c) => c.variantId === variant.variantId && c.type !== "UNIT_SECOND_SERIALIZED");
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.tempId === existing.tempId
            ? { ...c, quantity: Math.min(c.quantity + 1, c.stockAvailable) }
            : c,
        ),
      );
      return;
    }
    const newItem: PosCartItemV4 = {
      tempId: crypto.randomUUID(),
      type: product.conditionType === "NEW" ? "UNIT_NEW_QUANTITY" : "PRODUCT_QUANTITY",
      productId: product.productId,
      variantId: variant.variantId,
      unitId: null,
      nameSnapshot: product.name,
      variantSnapshot: variant.variantName,
      attributesSnapshot: variant.attributes ?? null,
      imeiSnapshot: null,
      serialNumberSnapshot: null,
      batteryHealthSnapshot: null,
      conditionSnapshot: null,
      quantity: 1,
      stockAvailable: variant.currentStock,
      price: variant.sellingPrice,
      costSnapshot: variant.costPrice,
    };
    setCart((prev) => [...prev, newItem]);
  }, [cart, openUnitPicker]);

  const updateCartQty = React.useCallback((tempId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.tempId !== tempId) return c;
        const newQty = c.quantity + delta;
        if (newQty <= 0) return c;
        return { ...c, quantity: Math.min(newQty, c.stockAvailable) };
      }),
    );
  }, []);

  const removeFromCart = React.useCallback((tempId: string) => {
    setCart((prev) => prev.filter((c) => c.tempId !== tempId));
  }, []);

  const clearCart = React.useCallback(() => {
    setCart([]);
    setCustomerId("");
    setDiscountAmount(0);
    setServiceFeeAmount(0);
    setSelectedMethod("");
    setPaidAmount(0);
    setNotes("");
  }, []);

  /* ── Totals ── */

  const subtotal = React.useMemo(
    () => cart.reduce((s, c) => s + c.price * c.quantity, 0),
    [cart],
  );
  const total = subtotal - discountAmount + serviceFeeAmount;
  const change = paidAmount - total;
  const isCash = paymentMethods.find((pm) => pm.branchPaymentMethodId === selectedMethod)?.paymentMethodType === "CASH";

  /* ── Checkout ── */

  const handleCheckout = React.useCallback(async () => {
    if (submitting) return;
    if (!selectedMethod) {
      triggerDynamicIslandFeedback({ title: "Pilih metode pembayaran.", type: "error" });
      return;
    }
    if (cart.length === 0) {
      triggerDynamicIslandFeedback({ title: "Keranjang kosong.", type: "error" });
      return;
    }
    if (isCash && paidAmount < total) {
      triggerDynamicIslandFeedback({ title: "Jumlah dibayar kurang.", type: "error" });
      return;
    }

    setSubmitting(true);
    triggerDynamicIslandFeedback({ title: "Memproses transaksi POS...", type: "loading" });

    const input: CheckoutPosV4Input & { branchId: string } = {
      branchId: activeBranchId!,
      paymentMethodId: selectedMethod,
      customerId: customerId || null,
      discountAmount,
      serviceFeeAmount,
      paidAmount: isCash ? paidAmount : total,
      notes: notes || null,
      items: cart.map((c) => ({
        itemType: c.type,
        variantId: c.type !== "UNIT_SECOND_SERIALIZED" ? c.variantId : undefined,
        unitId: c.type === "UNIT_SECOND_SERIALIZED" ? c.unitId : undefined,
        quantity: c.quantity,
        sellingPrice: c.price,
      })),
    };

    const res = await checkoutPosV4Action(brandSlug, input);
    setSubmitting(false);

    if (res.success) {
      const data = res.data as CheckoutPosV4Result;
      triggerDynamicIslandFeedback({
        title: "Transaksi berhasil",
        type: "success",
        description: data.transactionNumber,
      });
      clearCart();
      refreshAll();
    } else {
      triggerDynamicIslandFeedback({ title: res.error ?? "Transaksi gagal.", type: "error" });
    }
  }, [selectedMethod, submitting, cart, isCash, paidAmount, total, activeBranchId, customerId, discountAmount, serviceFeeAmount, notes, brandSlug, clearCart, refreshAll]);

  /* ── Detail ── */

  const openDetail = React.useCallback(async (tx: PosTransactionV4Row) => {
    setDetailTx(tx);
    setDetailOpen(true);
    const res = await getPosTransactionDetailV4Action(brandSlug, tx.id);
    if (res.success) setDetailItems(res.data ?? []);
  }, [brandSlug]);

  /* ── Void handler ── */

  const openVoid = React.useCallback((tx: PosTransactionV4Row) => {
    setDetailOpen(false);
    setDetailTx(tx);
    setVoidReason("");
    setVoidOpen(true);
  }, []);

  const handleVoid = React.useCallback(async () => {
    if (!detailTx || voidSaving || !activeBranchId) return;
    if (voidReason.trim().length < 5) return;
    setVoidSaving(true);
    const res = await voidPosTransactionV4Action(brandSlug, {
      transactionId: detailTx.id,
      reason: voidReason.trim(),
      branchId: activeBranchId,
    });
    setVoidSaving(false);
    if (res.success) {
      triggerDynamicIslandFeedback({
        title: "Transaksi dibatalkan",
        type: "success",
        description: detailTx.transactionNumber,
      });
      setVoidOpen(false);
      setDetailOpen(false);
      setDetailTx(null);
      refreshAll();
    } else {
      triggerDynamicIslandFeedback({ title: res.error ?? "Gagal membatalkan.", type: "error" });
    }
  }, [detailTx, voidReason, voidSaving, activeBranchId, brandSlug, refreshAll]);

  if (!activeBranchId) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Pilih cabang terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-sidebar-border bg-sidebar shadow-sm lg:flex-row">
        {/* ═══════════════ LEFT PANEL — Products ═══════════════ */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari produk, SKU, barcode, IMEI..."
                className="h-8 pl-7 text-xs"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                Beta
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[10px]"
                onClick={refreshAll}
              >
                <Loader2 className={`size-3 ${productsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-1.5">
            <button
              type="button"
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
              onClick={() => handleCategoryChange(null)}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                onClick={() => handleCategoryChange(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto overflow-x-visible p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {productsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!productsLoading && products.length === 0 && (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Tidak ada produk tersedia.
              </div>
            )}

            {!productsLoading && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <React.Fragment key={product.productId}>
                    {product.variants.length === 1 && product.variants[0]!.variantName === product.name ? (
                      /* Single variant - show as card */
                      <button
                        type="button"
                        className="text-left transition-transform hover:-translate-y-0.5 disabled:opacity-40"
                        onClick={() => addVariantToCart(product, product.variants[0]!)}
                        disabled={
                          product.conditionType !== "SECOND" && product.variants[0]!.currentStock <= 0
                        }
                      >
                        <MinimalCard className="h-full rounded-[18px] p-2">
                          <ProductImageFrame
                            src={getDisplayImage(product, product.variants[0]!)}
                            name={product.name}
                            isUnit={product.productKind === "UNIT"}
                          />
                          <div className="space-y-2 px-1 pb-1">
                            <div className="flex items-start justify-between gap-2">
                              <MinimalCardTitle className="mt-0 line-clamp-2 px-0 text-xs">{product.name}</MinimalCardTitle>
                              <Badge variant="outline" className={`h-5 shrink-0 rounded-full px-2 text-[9px] font-normal ${stockBadge(product.variants[0]!, product.conditionType === "SECOND").className}`}>
                                {stockBadge(product.variants[0]!, product.conditionType === "SECOND").label}
                              </Badge>
                            </div>
                            <MinimalCardDescription className="px-0 pb-0 text-[10px]">
                              {product.categoryName ?? (product.productKind === "UNIT" ? "Unit" : "Produk")}
                            </MinimalCardDescription>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold tabular-nums">{formatPrice(product.variants[0]!.sellingPrice)}</span>
                              {product.conditionType !== "SECOND" && (
                                <span className="text-[10px] text-muted-foreground">Stok {product.variants[0]!.currentStock}</span>
                              )}
                            </div>
                          </div>
                        </MinimalCard>
                      </button>
                    ) : (
                      /* Multi-variant - show product card with variant chips */
                      <MinimalCard className="h-full rounded-[18px] p-2">
                        <ProductImageFrame
                          src={getDisplayImage(product, product.variants.find((v) => v.imageUrl) ?? product.variants[0])}
                          name={product.name}
                          isUnit={product.productKind === "UNIT"}
                        />
                        <div className="space-y-2 px-1 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <MinimalCardTitle className="mt-0 line-clamp-2 px-0 text-xs">{product.name}</MinimalCardTitle>
                            {product.conditionType === "SECOND" && (
                              <Badge variant="outline" className="h-5 shrink-0 rounded-full border-blue-200 bg-blue-50 px-2 text-[9px] font-normal text-blue-700">
                                {product.variants.reduce((sum, v) => sum + v.currentStock, 0)} ready
                              </Badge>
                            )}
                          </div>
                          <MinimalCardDescription className="px-0 pb-0 text-[10px]">
                            {product.categoryName ?? (product.productKind === "UNIT" ? "Unit" : "Produk")}
                          </MinimalCardDescription>
                          <div className="flex flex-wrap gap-1">
                          {product.variants.map((variant) => (
                            <button
                              key={variant.variantId}
                              type="button"
                              className="rounded-full border border-sidebar-border bg-background/85 px-2 py-1 text-[10px] transition-colors hover:bg-accent disabled:opacity-40 dark:bg-background/70"
                              onClick={() => addVariantToCart(product, variant)}
                              disabled={
                                product.conditionType !== "SECOND" && variant.currentStock <= 0
                              }
                            >
                              {variant.variantName}
                              {product.conditionType !== "SECOND" && (
                                <span className="ml-1 text-muted-foreground">({variant.currentStock})</span>
                              )}
                            </button>
                          ))}
                          </div>
                          <div className="text-xs font-semibold tabular-nums">
                          {formatPrice(Math.min(...product.variants.map((v) => v.sellingPrice)))}
                          {product.variants.some((v) => v.sellingPrice !== product.variants[0]!.sellingPrice) ? "+" : ""}
                          </div>
                        </div>
                      </MinimalCard>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════ RIGHT PANEL — Cart + Payment ═══════════════ */}
        <aside className="flex min-h-[320px] w-full shrink-0 flex-col border-t border-sidebar-border bg-sidebar lg:min-h-0 lg:w-[380px] lg:border-l lg:border-t-0">
          {/* Cart */}
          <div className="flex-1 overflow-y-auto border-b p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold flex items-center gap-1.5">
                <ShoppingCart className="size-3.5" />
                Keranjang ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="text-[10px] text-destructive hover:underline"
                  onClick={clearCart}
                >
                  Kosongkan
                </button>
              )}
            </div>

            {cart.length === 0 && (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Keranjang kosong
              </div>
            )}

            <div className="space-y-1.5">
              {cart.map((item) => {
                const serializedMetaBadges =
                  item.type === "UNIT_SECOND_SERIALIZED" ? getSerializedMetaBadges(item) : [];
                const placeBadgesBelowTitle =
                  serializedMetaBadges.length >= 4 ||
                  serializedMetaBadges.join(" ").length > 32;

                return (
                <div key={item.tempId} className="flex flex-col gap-2 rounded-xl border border-sidebar-border bg-background/75 px-2.5 py-2.5 backdrop-blur-[1px] dark:bg-background/55">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium leading-none">{item.nameSnapshot}</div>
                      {shouldShowVariant(item.nameSnapshot, item.variantSnapshot) && (
                        <div className="mt-1 truncate text-[10px] text-muted-foreground">
                          {item.variantSnapshot}
                        </div>
                      )}
                      {!placeBadgesBelowTitle && serializedMetaBadges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {serializedMetaBadges.map((badge, index) => (
                            <Badge
                              key={`${item.tempId}-inline-${index}`}
                              variant="secondary"
                              className="max-w-full rounded-md px-1.5 py-0 text-[9px] font-normal"
                            >
                              <span className="truncate">{badge}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 shrink-0">
                      {item.type === "UNIT_SECOND_SERIALIZED" ? (
                        <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[9px] font-medium">
                          x1
                        </Badge>
                      ) : (
                        <div className="flex items-center rounded-md border border-sidebar-border bg-background/90 px-1 dark:bg-background/70">
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                            onClick={() => updateCartQty(item.tempId, -1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="min-w-5 px-1 text-center text-[10px] font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                            onClick={() => updateCartQty(item.tempId, 1)}
                            disabled={item.quantity >= item.stockAvailable}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                        onClick={() => removeFromCart(item.tempId)}
                        aria-label={`Hapus ${item.nameSnapshot} dari keranjang`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>

                  {item.type === "UNIT_SECOND_SERIALIZED" && placeBadgesBelowTitle && (
                    <div className="flex flex-wrap gap-1">
                      {serializedMetaBadges.map((badge, index) => (
                        <Badge
                          key={`${item.tempId}-below-${index}`}
                          variant="secondary"
                          className="max-w-full rounded-md px-1.5 py-0 text-[9px] font-normal"
                        >
                          <span className="truncate">{badge}</span>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="truncate text-muted-foreground">
                      {item.type === "UNIT_SECOND_SERIALIZED"
                        ? "Unit serialized"
                        : `${item.stockAvailable} unit tersedia`}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-2.5 border-b p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[10px] shrink-0 w-14">Diskon</Label>
              <Input
                type="number"
                value={discountAmount || ""}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="h-7 text-[10px]"
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[10px] shrink-0 w-14">Biaya Jasa</Label>
              <Input
                type="number"
                value={serviceFeeAmount || ""}
                onChange={(e) => setServiceFeeAmount(Number(e.target.value) || 0)}
                className="h-7 text-[10px]"
                placeholder="0"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment method & checkout */}
          <div className="space-y-2.5 p-3">
            <div>
              <Label className="text-[10px]">Metode Pembayaran</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.branchPaymentMethodId} value={pm.branchPaymentMethodId} className="text-xs">
                      {pm.paymentMethodName ?? pm.methodType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCash && (
              <div>
                <Label className="text-[10px]">Jumlah Dibayar</Label>
                <Input
                  type="number"
                  value={paidAmount || ""}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="mt-1 h-8 text-xs"
                  placeholder="0"
                />
                {paidAmount > 0 && (
                  <div className={`mt-1 flex items-center justify-between text-[10px] ${change >= 0 ? "text-muted-foreground" : "text-destructive font-medium"}`}>
                    <span>Kembali</span>
                    <span className="tabular-nums">{formatPrice(change)}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="text-[10px]">Catatan (opsional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-8 text-xs"
                placeholder="Catatan transaksi"
              />
            </div>

            <Button
              className="h-9 w-full gap-1.5 text-xs"
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0 || !selectedMethod}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CreditCard className="size-3.5" />
              )}
              {submitting ? "Memproses..." : `Bayar ${formatPrice(total)}`}
            </Button>
          </div>

          {/* Transaction History */}
          <div className="border-t p-3">
            <h3 className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Riwayat Transaksi
            </h3>
            {txLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {transactions.slice(0, 10).map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] transition-colors hover:bg-accent"
                    onClick={() => openDetail(tx)}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-medium truncate">{tx.transactionNumber}</div>
                      <div className="text-muted-foreground">{formatPrice(tx.totalAmount)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tx.status === "VOIDED" ? (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">VOIDED</Badge>
                      ) : tx.status === "REFUNDED" ? (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">REFUND</Badge>
                      ) : null}
                      <Eye className="size-3 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ═══════════════ Unit Second Picker Dialog ═══════════════ */}
      <Dialog open={unitPickerOpen} onOpenChange={setUnitPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Pilih Unit Second</DialogTitle>
            <DialogDescription className="text-xs">
              {unitPickerProductName || "Pilih unit yang akan ditambahkan ke keranjang."}
            </DialogDescription>
          </DialogHeader>

          {unitOptions.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Belum ada unit ready stock.</p>
          ) : (
            <div className="space-y-1.5">
              {unitOptions.map((unit) => (
                <button
                  key={unit.unitId}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-xs transition-colors hover:bg-accent"
                  onClick={() => addUnitToCart(unit)}
                >
                  {unit.unitAttributes && (
                    <div className="shrink-0 space-y-0.5">
                      {(unit.unitAttributes as any).Warna && (
                        <div className="text-[10px]"><span className="text-muted-foreground">Warna:</span> {(unit.unitAttributes as any).Warna}</div>
                      )}
                      {(unit.unitAttributes as any).Storage && (
                        <div className="text-[10px]"><span className="text-muted-foreground">Storage:</span> {(unit.unitAttributes as any).Storage}</div>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {unit.imei && (
                      <div className="text-[10px] font-mono"><span className="text-muted-foreground">IMEI:</span> {unit.imei}</div>
                    )}
                    {unit.batteryHealth !== null && (
                      <div className="text-[10px]"><span className="text-muted-foreground">BH:</span> {unit.batteryHealth}%</div>
                    )}
                    {unit.conditionGrade && (
                      <div className="text-[10px]"><span className="text-muted-foreground">Kondisi:</span> {unit.conditionGrade}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold">{formatPrice(unit.sellingPrice)}</div>
                    <Badge variant="outline" className="text-[10px]">{unit.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Transaction Detail Dialog ═══════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Detail Transaksi</DialogTitle>
            <DialogDescription className="text-xs">
              {detailTx?.transactionNumber ?? ""}
            </DialogDescription>
          </DialogHeader>

          {detailItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada item.</p>
          ) : (
            <div className="space-y-2">
              {detailItems.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{item.itemNameSnapshot}</div>
                      {item.variantNameSnapshot && (
                        <div className="text-[10px] text-muted-foreground">{item.variantNameSnapshot}</div>
                      )}
                      {item.imeiSnapshot && (
                        <div className="text-[10px] font-mono text-muted-foreground">IMEI: {item.imeiSnapshot}</div>
                      )}
                      {item.batteryHealthSnapshot !== null && (
                        <div className="text-[10px] text-muted-foreground">BH: {item.batteryHealthSnapshot}%</div>
                      )}
                      {item.conditionSnapshot && (
                        <div className="text-[10px] text-muted-foreground">Kondisi: {item.conditionSnapshot}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold">{formatPrice(item.sellingPriceSnapshot * item.quantity)}</div>
                      <div className="text-[10px] text-muted-foreground">x{item.quantity}</div>
                    </div>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Total</span>
                <span className="font-semibold">{formatPrice(detailTx?.totalAmount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Dibayar</span>
                <span>{formatPrice(detailTx?.paidAmount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Kembali</span>
                <span>{formatPrice(detailTx?.changeAmount ?? 0)}</span>
              </div>
              {detailTx?.status && detailTx.status !== "COMPLETED" && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Status</span>
                  <Badge variant={detailTx.status === "VOIDED" ? "destructive" : "secondary"} className="text-[9px]">
                    {detailTx.status}
                  </Badge>
                </div>
              )}
              {canVoid && detailTx?.status === "COMPLETED" && (
                <>
                  <Separator />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => openVoid(detailTx)}
                  >
                    <X className="mr-1 size-3" />
                    Batalkan Transaksi
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Void Confirmation Dialog ═══════════════ */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Konfirmasi Pembatalan
            </DialogTitle>
            <DialogDescription className="text-xs">
              {detailTx?.transactionNumber ?? ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1">
              <p className="font-medium text-destructive">Tindakan ini tidak dapat dibatalkan.</p>
              <p className="text-muted-foreground">
                Stok barang akan dikembalikan, unit second akan dikembalikan ke Ready Stock,
                dan pembayaran akan direversal.
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-medium text-foreground">{formatPrice(detailTx?.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dibayar</span>
                <span className="font-medium text-foreground">{formatPrice(detailTx?.paidAmount ?? 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="void-reason" className="text-xs">
                Alasan Pembatalan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="void-reason"
                placeholder="Minimal 5 karakter. Contoh: Pelanggan membatalkan pesanan..."
                className="text-xs min-h-[72px]"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
              {voidReason.trim().length > 0 && voidReason.trim().length < 5 && (
                <p className="text-[10px] text-destructive">
                  Minimal 5 karakter ({voidReason.trim().length}/5)
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setVoidOpen(false)}
              disabled={voidSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={handleVoid}
              disabled={voidSaving || voidReason.trim().length < 5}
            >
              {voidSaving ? (
                <>
                  <Loader2 className="mr-1 size-3 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <X className="mr-1 size-3" />
                  Ya, Batalkan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
