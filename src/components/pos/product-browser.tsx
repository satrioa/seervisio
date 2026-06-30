// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package } from "lucide-react";
import type { PosProductResult, CartDeviceUnit } from "@/domain/pos/types";
import { getAvailableDeviceUnitsAction } from "@/server/actions/pos.actions";
import { DeviceUnitDialog } from "./device-unit-dialog";

function ScrollArea({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`${className ?? ""} overflow-y-auto overflow-x-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>{children}</div>;
}

/* ─── Type Filter Tabs ─── */

const TYPE_TABS = [
  { label: "Semua", value: undefined },
  { label: "Produk", value: "PRODUCT" },
  { label: "Unit", value: "UNIT" },
] as const;

/* ─── Product Card ─── */

function ProductCard({
  product,
  onAdd,
  isInCart,
  brandSlug,
  branchId,
}: {
  product: PosProductResult;
  onAdd: (product: PosProductResult, qty?: number, unit?: CartDeviceUnit) => void;
  isInCart: boolean;
  brandSlug: string;
  branchId: string | null;
}) {
  const [showUnitDialog, setShowUnitDialog] = React.useState(false);
  const [units, setUnits] = React.useState<CartDeviceUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const isDeviceUnit = product.itemType === "DEVICE_UNIT";
  const outOfStock = product.availableStock <= 0 && !isDeviceUnit;
  const noUnitsAvailable = isDeviceUnit && product.availableUnitsCount <= 0;
  const hasImage = !!product.imageUrl && !imageError;

  const handleAdd = async () => {
    if (isDeviceUnit) {
      if (!branchId) return;
      setLoadingUnits(true);
      const result = await getAvailableDeviceUnitsAction(brandSlug, product.id, branchId);
      setLoadingUnits(false);
      if (result.success && result.data.length > 0) {
        setUnits(result.data);
        setShowUnitDialog(true);
      }
    } else {
      onAdd(product);
    }
  };

  const handleSelectUnit = (unit: CartDeviceUnit) => {
    onAdd(product, 1, unit);
    setShowUnitDialog(false);
  };

  const typeBadge = () => {
    switch (product.itemType) {
      case "PRODUCT": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Produk</Badge>;
      case "SPAREPART": return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sparepart</Badge>;
      case "SUPPLY": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Supply</Badge>;
      case "DEVICE_UNIT": return <Badge variant="default" className="text-[10px] px-1.5 py-0">Unit</Badge>;
      default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Produk</Badge>;
    }
  };

  return (
    <>
      <div
        className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 ${
          outOfStock || noUnitsAvailable ? "opacity-50" : ""
        } ${
          isInCart
            ? "border-primary/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
            : "border-border hover:border-primary/30 hover:shadow-sm"
        }`}
      >
        {/* Image Area — square aspect, muted bg, contain */}
        <div className="relative aspect-square overflow-hidden bg-muted/40">
          {hasImage ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-muted/20" />
              <img
                src={product.imageUrl!}
                alt={product.name}
                className="size-full object-contain p-5 drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.03]"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex size-full items-center justify-center p-8">
              <Package className="size-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          {/* Name + Add button row */}
          <div className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</span>
            <Button
              size="sm"
              variant={isInCart ? "secondary" : "default"}
              className="shrink-0 ml-1 mt-0.5 size-7 p-0"
              disabled={outOfStock || noUnitsAvailable || isInCart}
              onClick={handleAdd}
            >
              {loadingUnits ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="size-3.5" />
              )}
            </Button>
          </div>

          {/* Badge row */}
          <div className="flex items-center gap-1.5">{typeBadge()}</div>

          {/* Price + stock */}
          <div className="mt-auto flex items-baseline justify-between gap-2 pt-1.5">
            <span className="text-sm font-bold tabular-nums tracking-tight">
              Rp{product.sellingPrice.toLocaleString("id-ID")}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {isDeviceUnit
                ? `${product.availableUnitsCount} unit`
                : `Stok: ${product.availableStock}`}
            </span>
          </div>
        </div>
      </div>

      {showUnitDialog && (
        <DeviceUnitDialog
          units={units}
          productName={product.name}
          onSelect={handleSelectUnit}
          onClose={() => setShowUnitDialog(false)}
        />
      )}
    </>
  );
}

/* ─── Product Browser ─── */

interface ProductBrowserProps {
  products: PosProductResult[];
  loading: boolean;
  searchQuery: string;
  typeFilter?: string;
  onSearch: (query: string) => void;
  onTypeFilter: (type?: string) => void;
  onAddToCart: (product: PosProductResult, qty?: number, unit?: CartDeviceUnit) => void;
  cartItemIds: Set<string>;
  brandSlug: string;
  branchId: string | null;
}

export function ProductBrowser({
  products,
  loading,
  searchQuery,
  typeFilter,
  onSearch,
  onTypeFilter,
  onAddToCart,
  cartItemIds,
  brandSlug,
  branchId,
}: ProductBrowserProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-visible">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari produk..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type Filter Tabs */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TYPE_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={typeFilter === tab.value ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 shrink-0"
            onClick={() => onTypeFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Product Grid */}
      <ScrollArea className="min-h-0 flex-1 px-0.5 pb-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 pr-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border bg-card animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-3.5 w-1/3 rounded bg-muted pt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Tidak ada produk ditemukan</p>
            <p className="text-xs">Coba ubah kata kunci atau filter kategori</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pr-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={onAddToCart}
                isInCart={cartItemIds.has(product.id)}
                brandSlug={brandSlug}
                branchId={branchId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
