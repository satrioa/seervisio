"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Search, Plus, Minus, X, Loader2, ShoppingCart, CreditCard,
  Smartphone, Package,   ChevronDown, ChevronUp, ChevronLeft,
  Receipt, Eye, AlertTriangle, History,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardTitle,
} from "@/components/ui/minimal-card";
import {
  FamilyDrawerRoot,
  FamilyDrawerPortal,
  FamilyDrawerOverlay,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
} from "@/components/ui/family-drawer";
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

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function getDisplayImage(product: PosProductV4Row, variant?: PosVariantV4Row) {
  return variant?.imageUrl ?? product.imageUrl ?? product.fallbackUnitImageUrl ?? null;
}

function stockBadge(variant: PosVariantV4Row, isUnitSecond: boolean) {
  if (isUnitSecond) {
    return {
      label: `${variant.currentStock} ready`,
      className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200",
    };
  }
  if (variant.currentStock <= 0) {
    return {
      label: "Habis",
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200",
    };
  }
  if (variant.minStock > 0 && variant.currentStock <= variant.minStock) {
    return {
      label: "Menipis",
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
    };
  }
  return {
    label: "Ready",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200",
  };
}

function getPaymentMethodLabel(pm: PaymentMethodOption) {
  return pm.paymentMethodName ?? pm.methodType ?? pm.paymentMethodType ?? "Metode";
}

function isCashPaymentMethod(pm?: PaymentMethodOption | null) {
  if (!pm) return false;

  const value = `${pm.paymentMethodType ?? ""} ${pm.methodType ?? ""} ${pm.paymentMethodName ?? ""}`.toLowerCase();
  return value.includes("cash") || value.includes("tunai");
}

/* ─── Shared product card ─── */

function PosProductCard({
  product,
  onClick,
  disabled,
}: {
  product: PosProductV4Row;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isUnitSecond = product.productKind === "UNIT" && product.conditionType === "SECOND";
  const firstVariant = product.variants[0]!;
  const isSingleVariant = product.variants.length === 1;

  const displayImage =
    product.variants.find((v) => v.imageUrl)?.imageUrl ??
    firstVariant?.imageUrl ??
    product.imageUrl ??
    product.fallbackUnitImageUrl ??
    null;

  const badge = isSingleVariant ? stockBadge(firstVariant, isUnitSecond) : null;

  const prices = product.variants
    .map((v) => Number(v.sellingPrice ?? 0))
    .filter((p) => Number.isFinite(p) && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;
  const priceText = minPrice <= 0
    ? formatPrice(0)
    : minPrice === maxPrice
      ? formatPrice(minPrice)
      : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

  const initials = product.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const totalUnitSecondStock = isUnitSecond
    ? product.variants.reduce((s, v) => s + v.currentStock, 0)
    : 0;

  return (
    <button
      id={`pos-product-${product.productId}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-[220px] text-left disabled:opacity-40"
    >
      <div className="relative flex h-[238px] w-full flex-col rounded-[14px] border border-border bg-card p-3 text-card-foreground shadow-sm transition hover:border-sidebar-accent hover:bg-card/95 hover:shadow-md dark:border-sidebar-border dark:bg-background/70 dark:hover:bg-background/85">
        <div className="relative mb-3 flex h-[100px] w-full items-center justify-center overflow-hidden rounded-xl bg-muted/60 dark:bg-sidebar-accent/45">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.name}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
              {product.productKind === "UNIT" ? (
                <Smartphone className="h-7 w-7" />
              ) : (
                <Package className="h-7 w-7" />
              )}
              <span className="mt-1 text-xs font-medium">{initials || "—"}</span>
            </div>
          )}
          {isSingleVariant && badge && (
             <Badge
               variant="outline"
               className={`absolute right-2 top-2 h-5 shrink-0 rounded-full border px-2 text-[10px] font-medium ${badge.className}`}
             >
               {badge.label}
             </Badge>
          )}
          {!isSingleVariant && isUnitSecond && (
            <Badge
              variant="outline"
              className="absolute right-2 top-2 h-5 rounded-full border-blue-200 bg-blue-50 px-2 text-[10px] font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200"
            >
              {totalUnitSecondStock} ready
            </Badge>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-[42px]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">
                {product.name}
              </h3>
              {isSingleVariant && badge && (
                <Badge
                  variant="outline"
                  className={`h-5 shrink-0 rounded-full px-2 text-[10px] font-medium ${badge.className}`}
                >
                  {badge.label}
                </Badge>
              )}
            </div>
            
          </div>

          <div className="mt-2 flex min-h-[24px] shrink-0 flex-wrap gap-1.5 overflow-hidden">
            {!isSingleVariant &&
              product.variants.slice(0, 2).map((v) => (
                <span
                  key={v.variantId}
                  className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground dark:bg-sidebar-accent/55"
                >
                  {v.variantName}
                </span>
              ))}

            {!isSingleVariant && product.variants.length > 2 && (
              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground dark:bg-sidebar-accent/55">
                +{product.variants.length - 2}
              </span>
            )}
            {isSingleVariant && shouldShowVariant(product.name, firstVariant.variantName) && (
              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground dark:bg-sidebar-accent/55">
                {firstVariant.variantName}
              </span>
            )}
          </div>

          <div className="mt-auto flex shrink-0 items-center justify-between pt-2">
            <span className="text-sm font-bold tabular-nums text-foreground">
              {priceText}
            </span>
            {isSingleVariant && !isUnitSecond && (
              <span className="text-xs text-muted-foreground">
                Stok {firstVariant.currentStock}
              </span>
            )}
          </div>
        </div>

        {!isSingleVariant && isUnitSecond && (
          <Badge
            variant="outline"
            className="absolute right-3 top-3 h-5 rounded-full border-blue-200 bg-blue-50 px-2 text-[10px] font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200"
          >
            {totalUnitSecondStock} ready
          </Badge>
        )}
      </div>
    </button>
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
  const [categories, setCategories] = React.useState<{ id: string; name: string; itemType: string }[]>([]);
  const [activeType, setActiveType] = React.useState<"semua" | "produk" | "unit">("semua");
  const [unitOptions, setUnitOptions] = React.useState<PosUnitSecondOptionV4Row[]>([]);
  const [unitPickerOpen, setUnitPickerOpen] = React.useState(false);
  const [unitPickerProductName, setUnitPickerProductName] = React.useState("");

  /* ── Variant Picker ── */
  const [variantPickerOpen, setVariantPickerOpen] = React.useState(false);
  const [variantPickerProduct, setVariantPickerProduct] = React.useState<PosProductV4Row | null>(null);

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
  const [txDrawerOpen, setTxDrawerOpen] = React.useState(false);
  const [txDateRange, setTxDateRange] = React.useState<{ from?: string; to?: string } | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailItems, setDetailItems] = React.useState<PosTransactionItemV4Row[]>([]);
  const [detailTx, setDetailTx] = React.useState<PosTransactionV4Row | null>(null);

  /* ── Mobile Drawer ── */
  const [mobileCartOpen, setMobileCartOpen] = React.useState(false);
  const [mobileDrawerView, setMobileDrawerView] = React.useState<"cart" | "payment">("cart");

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
    console.log("[pos-v4/client] activeBranchId", activeBranchId);
    const res = await listPosProductsV4Action(brandSlug, activeBranchId, categoryId, search || undefined);
    console.log("[pos-v4/client] products result", res);
    if (res.success) setProducts(res.data ?? []);
    setProductsLoading(false);
  }, [brandSlug, activeBranchId]);

  const fetchCategories = React.useCallback(async () => {
    const res = await listPosCategoriesV4Action(brandSlug);
    if (res.success) {
      setCategories((res.data ?? []).map((c) => ({ id: c.id, name: c.name, itemType: c.itemType })));
    }
  }, [brandSlug]);

  const fetchPaymentMethods = React.useCallback(async () => {
    if (!activeBranchId) return;
    console.log("[pos-v4/payment-methods] fetching", { brandSlug, branchId: activeBranchId });
    const res = await listPosPaymentMethodsV4Action(brandSlug, activeBranchId);
    if (res.success) {
      console.log("[pos-v4/payment-methods] loaded", { count: res.data?.length ?? 0 });
      setPaymentMethods(res.data);
    } else {
      console.warn("[pos-v4/payment-methods] failed", res.error);
    }
  }, [brandSlug, activeBranchId]);

  const fetchTransactions = React.useCallback(async () => {
    if (!activeBranchId) return;
    setTxLoading(true);
    const res = await listPosTransactionsV4Action(brandSlug, activeBranchId, 1, txDateRange);
    if (res.success) {
      const r = res.data as any;
      setTransactions(r.data ?? []);
    }
    setTxLoading(false);
  }, [brandSlug, activeBranchId, txDateRange]);

  React.useEffect(() => {
    if (!activeBranchId) return;
    fetchCategories();
    fetchPaymentMethods();
    fetchProducts(null, "");
    fetchTransactions();
  }, [activeBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!activeBranchId || !txDrawerOpen) return;
    fetchTransactions();
  }, [txDateRange, txDrawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const visibleCategories = React.useMemo(() => {
    if (activeType === "semua") return categories;
    return categories.filter((c) =>
      activeType === "produk" ? c.itemType === "PRODUCT" : c.itemType === "DEVICE_UNIT",
    );
  }, [categories, activeType]);

  const handleTypeChange = React.useCallback((type: "semua" | "produk" | "unit") => {
    setActiveType(type);
    const allowed = type === "semua"
      ? categories
      : categories.filter((c) => (type === "produk" ? c.itemType === "PRODUCT" : c.itemType === "DEVICE_UNIT"));
    if (activeCategory && !allowed.some((c) => c.id === activeCategory)) {
      setActiveCategory(null);
      fetchProducts(null, searchTerm);
    }
  }, [categories, activeCategory, searchTerm, fetchProducts]);

  const filteredProducts = React.useMemo(() => {
    if (activeType === "semua") return products;
    return products.filter((p) =>
      activeType === "produk" ? p.productKind === "PRODUCT" : p.productKind === "UNIT",
    );
  }, [products, activeType]);

  /* ── Unit Second Picker ── */

  const openUnitPicker = React.useCallback(async (productIds: string[], productName: string) => {
    if (!activeBranchId) return;
    setUnitPickerProductName(productName);
    setUnitPickerOpen(true);
    const res = await listPosUnitOptionsV4Action(brandSlug, productIds, activeBranchId);
    if (res.success) setUnitOptions(res.data ?? []);
  }, [brandSlug, activeBranchId]);

  const addUnitToCart = React.useCallback((unit: PosUnitSecondOptionV4Row) => {
    if (cart.some((c) => c.unitId === unit.unitId)) {
      triggerDynamicIslandFeedback({ title: "Unit sudah ada di keranjang.", type: "error" });
      return;
    }
    const product = products.find((p) => p.productId === unit.productId || p.productIds?.includes(unit.productId));
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
      openUnitPicker(product.productIds ?? [product.productId], product.name);
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

  const handleProductClick = React.useCallback((product: PosProductV4Row) => {
    const variants = product.variants ?? [];
    console.log("[pos-v4] product clicked", {
      productId: product.productId,
      name: product.name,
      productKind: product.productKind,
      conditionType: product.conditionType,
      variantsCount: variants.length,
    });

    // Unit SECOND → open IMEI picker
    if (product.productKind === "UNIT" && product.conditionType === "SECOND") {
      openUnitPicker(product.productIds ?? [product.productId], product.name);
      return;
    }

    if (variants.length === 0) {
      triggerDynamicIslandFeedback({ title: "Varian belum tersedia atau stok kosong.", type: "error" });
      return;
    }

    if (variants.length === 1) {
      addVariantToCart(product, variants[0]!);
      return;
    }

    // Multi-variant → open picker dialog
    setVariantPickerProduct(product);
    setVariantPickerOpen(true);
  }, [openUnitPicker, addVariantToCart]);

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
  const selectedPaymentMethod = paymentMethods.find(
    (pm) => pm.paymentMethodId === selectedMethod,
  );
  const isCash = isCashPaymentMethod(selectedPaymentMethod);

  React.useEffect(() => {
    if (selectedMethod || paymentMethods.length === 0) return;

    const cashMethod = paymentMethods.find((pm) => isCashPaymentMethod(pm));
    setSelectedMethod(((cashMethod ?? paymentMethods[0])!).paymentMethodId!);
  }, [paymentMethods, selectedMethod]);

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

    console.log("[pos-v4/checkout] input", {
      branchId: activeBranchId,
      selectedMethod,
      paymentMethods,
      total,
      paidAmount: isCash ? paidAmount : total,
    });

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
      window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
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
      window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
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
    <>
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row gap-3 bg-transparent text-sidebar-foreground">
        {/* ═══════════════ LEFT PANEL — Products ═══════════════ */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
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

          {/* Type + Category filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-1.5">
            <div className="flex shrink-0 items-center gap-1.5">
              {([
                { id: "semua", label: "Semua" },
                { id: "produk", label: "Produk" },
                { id: "unit", label: "Unit" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    activeType === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                  onClick={() => handleTypeChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mx-1 h-4 w-px shrink-0 bg-border" />

            <div className="flex shrink-0 items-center gap-1.5">
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
              {visibleCategories.map((cat) => (
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
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto overflow-x-visible p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {productsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!productsLoading && products.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Package className="size-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Belum ada produk di POS</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
                    Pastikan produk aktif, muncul di POS, berada di cabang aktif, dan memiliki stok ready.
                  </p>
                </div>
                {canManage && (
                  <p className="text-[10px] text-muted-foreground/50">
                    Branch: {activeBranchId} · Kategori: {activeCategory ?? "semua"} · Cari: {searchTerm || "—"}
                  </p>
                )}
              </div>
            )}

            {!productsLoading && products.length > 0 && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Package className="size-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tidak ada item untuk filter ini</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
                    Coba pilih tipe {activeType === "produk" ? "Produk" : "Unit"} lain atau ganti kategori.
                  </p>
                </div>
              </div>
            )}

            {!productsLoading && filteredProducts.length > 0 && (
              <div className="grid justify-start gap-3 p-3 sm:gap-4 sm:p-4 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,200px)] lg:[grid-template-columns:repeat(auto-fill,220px)]">
                {filteredProducts.map((product) => {
                  const isUnitSecond = product.productKind === "UNIT" && product.conditionType === "SECOND";
                  const firstVariant = product.variants[0]!;

                  // Determine disabled state:
                  // single non-SECOND with no stock → disabled
                  const disabled =
                    !isUnitSecond &&
                    product.variants.length === 1 &&
                    firstVariant.currentStock <= 0;

                  return (
                    <PosProductCard
                      key={product.productId}
                      product={product}
                      onClick={() => handleProductClick(product)}
                      disabled={disabled}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════ RIGHT PANEL — Cart + Payment ═══════════════ */}
        <aside className="hidden min-h-[320px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm md:flex lg:min-h-0 lg:w-[380px]">
          {/* Cart */}
          <div className="flex min-h-0 flex-1 flex-col border-b">
            <div className="flex shrink-0 items-center justify-between border-b bg-card/95 px-3 py-2.5 backdrop-blur">
              <h2 className="flex items-center gap-2 text-xs font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ShoppingCart className="size-3.5" />
                </span>
                <span>Keranjang</span>
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                  {cart.length}
                </Badge>
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setTxDrawerOpen(true)}
                  aria-label="Buka riwayat transaksi"
                >
                  <History className="size-3.5" />
                </button>
                {cart.length > 0 && (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                    onClick={clearCart}
                  >
                    Kosongkan
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-[168px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ShoppingCart className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium">Keranjang kosong</p>
                    <p className="max-w-[220px] text-[10px] leading-relaxed text-muted-foreground">
                      Pilih produk dari daftar untuk mulai membuat transaksi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {cart.map((item) => {
                    const serializedMetaBadges =
                      item.type === "UNIT_SECOND_SERIALIZED" ? getSerializedMetaBadges(item) : [];
                    const placeBadgesBelowTitle =
                      serializedMetaBadges.length >= 4 ||
                      serializedMetaBadges.join(" ").length > 32;

                    return (
                <div key={item.tempId} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/75 px-2.5 py-2.5 shadow-sm backdrop-blur-[1px] dark:bg-background/55">
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
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="border-b p-3">
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/15 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Label className="w-16 shrink-0 text-[10px] text-muted-foreground">Diskon</Label>
                <Input
                  type="number"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="h-7 text-[10px]"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="w-16 shrink-0 text-[10px] text-muted-foreground">Biaya Jasa</Label>
                <Input
                  type="number"
                  value={serviceFeeAmount || ""}
                  onChange={(e) => setServiceFeeAmount(Number(e.target.value) || 0)}
                  className="h-7 text-[10px]"
                  placeholder="0"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment method & checkout */}
          <div className="flex flex-col gap-2.5 p-3">
            <div className="flex flex-col gap-1.5">
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-[10px]">Metode Pembayaran</Label>
                {paymentMethods.length > 0 && (
                  <span className="text-[9px] text-muted-foreground">
                    {paymentMethods.length} aktif
                  </span>
                )}
              </div>

              {paymentMethods.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-border/70 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">Belum ada metode pembayaran aktif</div>
                  <p className="mt-1 text-[10px] leading-relaxed">
                    Aktifkan Cash, QRIS, Transfer, atau Debit di pengaturan metode pembayaran cabang ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {paymentMethods.map((pm) => {
                    const selected = selectedMethod === pm.paymentMethodId;
                    const label = getPaymentMethodLabel(pm);
                    const cashMethod = isCashPaymentMethod(pm);

                    return (
                      <button
                        key={pm.paymentMethodId ?? pm.branchPaymentMethodId}
                        type="button"
                        onClick={() => {
                          setSelectedMethod(pm.paymentMethodId!);

                          if (!cashMethod) {
                            setPaidAmount(total);
                          }
                        }}
                        className={`flex h-9 min-w-0 items-center justify-center rounded-lg border px-2 text-center text-[10px] font-medium transition-all ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/70 bg-background/75 text-foreground hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <span className="min-w-0 truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
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

            <div className="flex flex-col gap-1">
              <Label className="text-[10px]">Catatan (opsional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 text-xs"
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

            {/* Riwayat transaksi */}
            <Dialog open={txDrawerOpen} onOpenChange={setTxDrawerOpen}>
              <DialogContent
                showCloseButton={false}
                className="flex h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-[20px]"
              >
                <div className="flex h-full flex-col">
                  {/* Header */}
                  <div className="flex shrink-0 items-center justify-between border-b px-4 pt-4 pb-3">
                    <div>
                      <DialogTitle className="text-sm font-semibold">Riwayat Transaksi</DialogTitle>
                      <DialogDescription className="text-[11px]">
                        {txDateRange?.from
                          ? `${formatDateShort(txDateRange.from)}${txDateRange.to ? ` - ${formatDateShort(txDateRange.to)}` : ""}`
                          : "Semua transaksi"}
                      </DialogDescription>
                    </div>
                    <DialogClose>
                      <X className="size-3.5" />
                    </DialogClose>
                  </div>

                  {/* Date filter */}
                  <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
                    <Input
                      type="date"
                      aria-label="Dari tanggal"
                      value={txDateRange?.from ?? ""}
                      onChange={(e) => {
                        const next = { ...(txDateRange ?? {}), from: e.target.value || undefined };
                        setTxDateRange(next);
                      }}
                      className="h-8 w-full text-xs"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">s/d</span>
                    <Input
                      type="date"
                      aria-label="Sampai tanggal"
                      value={txDateRange?.to ?? ""}
                      onChange={(e) => {
                        const next = { ...(txDateRange ?? {}), to: e.target.value || undefined };
                        setTxDateRange(next);
                      }}
                      className="h-8 w-full text-xs"
                    />
                    {txDateRange?.from || txDateRange?.to ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setTxDateRange(null)}
                        aria-label="Reset filter tanggal"
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {txLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <Receipt className="size-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Belum ada transaksi pada rentang tanggal ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map((tx) => (
                          <button
                            key={tx.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl border border-sidebar-border bg-background/75 px-3.5 py-3 text-left transition-colors hover:bg-accent"
                            onClick={() => {
                              setTxDrawerOpen(false);
                              setTimeout(() => openDetail(tx), 200);
                            }}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-xs font-medium">{tx.transactionNumber}</div>
                              <div className="text-[10px] text-muted-foreground">{formatPrice(tx.totalAmount)}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {tx.status === "VOIDED" ? (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">VOID</Badge>
                              ) : tx.status === "REFUNDED" ? (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">REFUND</Badge>
                              ) : (
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] px-1.5 py-0 text-emerald-700">LUNAS</Badge>
                              )}
                              <Eye className="size-3.5 text-muted-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </aside>

      {/* ═══════════════ Variant Picker Dialog ═══════════════ */}
      <Dialog open={variantPickerOpen} onOpenChange={(open) => { setVariantPickerOpen(open); if (!open) setVariantPickerProduct(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Pilih Varian</DialogTitle>
            <DialogDescription className="text-xs">
              {variantPickerProduct?.name ?? "Pilih varian untuk ditambahkan ke keranjang."}
            </DialogDescription>
          </DialogHeader>

          {variantPickerProduct && (
            <div className="space-y-2 py-1">
              {variantPickerProduct.variants.map((variant) => {
                const outOfStock = variantPickerProduct.conditionType !== "SECOND" && variant.currentStock <= 0;
                return (
                  <button
                    key={variant.variantId}
                    id={`variant-option-${variant.variantId}`}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => {
                      addVariantToCart(variantPickerProduct, variant);
                      setVariantPickerOpen(false);
                      setVariantPickerProduct(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-sidebar-border bg-background/75 p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-xs font-medium">{variant.variantName}</div>
                      {variant.sku && (
                        <div className="text-[10px] text-muted-foreground">SKU: {variant.sku}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`h-4 rounded-full px-1.5 text-[9px] font-normal ${
                            outOfStock
                              ? "border-red-200 bg-red-50 text-red-700"
                              : variant.minStock > 0 && variant.currentStock <= variant.minStock
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {outOfStock ? "Habis" : `Stok ${variant.currentStock}`}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">{formatPrice(variant.sellingPrice)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/20">
                    {unit.imageUrl ? (
                      <img
                        src={unit.imageUrl}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Smartphone className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {unit.unitAttributes && (
                      <div className="flex flex-wrap gap-x-2 text-[10px]">
                        {(unit.unitAttributes as any).Warna && (
                          <span><span className="text-muted-foreground">Warna:</span> {(unit.unitAttributes as any).Warna}</span>
                        )}
                        {(unit.unitAttributes as any).Storage && (
                          <span><span className="text-muted-foreground">Storage:</span> {(unit.unitAttributes as any).Storage}</span>
                        )}
                      </div>
                    )}
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

    {/* ── Mobile floating cart button ── */}
    {cart.length > 0 && (
      <button
        type="button"
        onClick={() => { setMobileDrawerView("cart"); setMobileCartOpen(true); }}
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-primary px-5 py-3 text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <div className="relative">
          <ShoppingCart className="size-5" />
          <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {cart.length}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">{formatPrice(total)}</span>
      </button>
    )}

    {/* ── Mobile cart drawer ── */}
    <FamilyDrawerRoot
      open={mobileCartOpen}
      onOpenChange={(open) => { setMobileCartOpen(open); if (!open) setMobileDrawerView("cart"); }}
    >
      <FamilyDrawerPortal>
        <FamilyDrawerOverlay onClick={() => setMobileCartOpen(false)} />
        <FamilyDrawerContent className="inset-x-0 bottom-0 max-w-none rounded-b-none rounded-t-[20px] !rounded-[20px] w-full max-h-[92vh] md:!hidden">
          <FamilyDrawerAnimatedWrapper className="flex max-h-[85vh] flex-col overflow-hidden px-0 pb-0 pt-0">
            {/* Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-4 pb-3">
              {mobileDrawerView === "cart" ? (
                <>
                  <h2 className="flex items-center gap-2 text-xs font-semibold">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ShoppingCart className="size-3.5" />
                    </span>
                    <span>Keranjang</span>
                    <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                      {cart.length}
                    </Badge>
                  </h2>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                      onClick={clearCart}
                    >
                      Kosongkan
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setMobileDrawerView("cart")}
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <h2 className="text-xs font-semibold">Pembayaran</h2>
                  <div className="size-7" />
                </>
              )}
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {mobileDrawerView === "cart" ? (
                /* ── Cart Items ── */
                cart.length === 0 ? (
                  <div className="flex h-full min-h-[168px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ShoppingCart className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium">Keranjang kosong</p>
                      <p className="max-w-[220px] text-[10px] leading-relaxed text-muted-foreground">
                        Pilih produk dari daftar untuk mulai membuat transaksi.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {cart.map((item) => {
                      const serializedMetaBadges =
                        item.type === "UNIT_SECOND_SERIALIZED" ? getSerializedMetaBadges(item) : [];
                      const placeBadgesBelowTitle =
                        serializedMetaBadges.length >= 4 ||
                        serializedMetaBadges.join(" ").length > 32;

                      return (
                        <div key={item.tempId} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/75 px-2.5 py-2.5 shadow-sm backdrop-blur-[1px] dark:bg-background/55">
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
                      );
                    })}
                  </div>
                )
              ) : (
                /* ── Payment ── */
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 rounded-xl border bg-muted/15 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-16 shrink-0 text-[10px] text-muted-foreground">Diskon</Label>
                      <Input
                        type="number"
                        value={discountAmount || ""}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        className="h-7 text-[10px]"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-16 shrink-0 text-[10px] text-muted-foreground">Biaya Jasa</Label>
                      <Input
                        type="number"
                        value={serviceFeeAmount || ""}
                        onChange={(e) => setServiceFeeAmount(Number(e.target.value) || 0)}
                        className="h-7 text-[10px]"
                        placeholder="0"
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <Label className="text-[10px]">Metode Pembayaran</Label>
                      {paymentMethods.length > 0 && (
                        <span className="text-[9px] text-muted-foreground">{paymentMethods.length} aktif</span>
                      )}
                    </div>
                    {paymentMethods.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-border/70 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">Belum ada metode pembayaran aktif</div>
                        <p className="mt-1 text-[10px] leading-relaxed">
                          Aktifkan Cash, QRIS, Transfer, atau Debit di pengaturan metode pembayaran cabang ini.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {paymentMethods.map((pm) => {
                          const selected = selectedMethod === pm.paymentMethodId;
                          const label = getPaymentMethodLabel(pm);
                          const cashMethod = isCashPaymentMethod(pm);
                          return (
                            <button
                              key={pm.paymentMethodId ?? pm.branchPaymentMethodId}
                              type="button"
                              onClick={() => { setSelectedMethod(pm.paymentMethodId!); if (!cashMethod) setPaidAmount(total); }}
                              className={`flex h-9 min-w-0 items-center justify-center rounded-lg border px-2 text-center text-[10px] font-medium transition-all ${selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background/75 text-foreground hover:border-primary/40 hover:bg-muted/40"}`}

                            >
                              <span className="min-w-0 truncate">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
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

                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px]">Catatan (opsional)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Catatan transaksi"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              {mobileDrawerView === "cart" ? (
                cart.length > 0 ? (
                  <Button
                    className="h-9 w-full gap-1.5 text-xs"
                    onClick={() => setMobileDrawerView("payment")}
                  >
                    Lanjut ke Pembayaran — {formatPrice(total)}
                  </Button>
                ) : null
              ) : (
                <div className="flex flex-col gap-1.5">
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
                  <p className="text-center text-[9px] text-muted-foreground">
                    Pastikan nominal sudah benar sebelum membayar
                  </p>
                </div>
              )}
            </div>
          </FamilyDrawerAnimatedWrapper>
        </FamilyDrawerContent>
      </FamilyDrawerPortal>
    </FamilyDrawerRoot>
  </>
);
}
