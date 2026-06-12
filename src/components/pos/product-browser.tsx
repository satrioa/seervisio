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
  return <div className={`${className ?? ""} overflow-auto`}>{children}</div>;
}

/* ─── Type Filter Tabs ─── */

const TYPE_TABS = [
  { label: "Semua", value: undefined },
  { label: "Produk", value: "PRODUCT" },
  { label: "Sparepart", value: "SPAREPART" },
  { label: "Supply", value: "SUPPLY" },
  { label: "Unit", value: "DEVICE_UNIT" },
  { label: "Lainnya", value: "OTHER" },
] as const;

/* ─── Product Card ─── */

function ProductCard({
  product,
  onAdd,
  isInCart,
  brandSlug,
}: {
  product: PosProductResult;
  onAdd: (product: PosProductResult, qty?: number, unit?: CartDeviceUnit) => void;
  isInCart: boolean;
  brandSlug: string;
}) {
  const [showUnitDialog, setShowUnitDialog] = React.useState(false);
  const [units, setUnits] = React.useState<CartDeviceUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = React.useState(false);

  const isDeviceUnit = product.itemType === "DEVICE_UNIT";
  const outOfStock = product.availableStock <= 0 && !isDeviceUnit;
  const noUnitsAvailable = isDeviceUnit && product.availableUnitsCount <= 0;

  const handleAdd = async () => {
    if (isDeviceUnit) {
      setLoadingUnits(true);
      const result = await getAvailableDeviceUnitsAction(brandSlug, product.id);
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
      <div className={`rounded-lg border bg-card p-3 transition-colors ${outOfStock || noUnitsAvailable ? "opacity-50" : "hover:border-primary/50"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{product.name}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">{typeBadge()}</div>
            {product.sku && <p className="text-[10px] text-muted-foreground">SKU: {product.sku}</p>}
          </div>
          <Button
            size="sm"
            variant={isInCart ? "secondary" : "default"}
            className="shrink-0 h-8 w-8 p-0"
            disabled={outOfStock || noUnitsAvailable || isInCart}
            onClick={handleAdd}
          >
            {loadingUnits ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <span className="text-sm font-semibold">
            Rp {product.sellingPrice.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isDeviceUnit
              ? `${product.availableUnitsCount} unit`
              : `Stok: ${product.availableStock}`}
          </span>
        </div>
        {isInCart && <p className="text-[10px] text-primary mt-1">Sudah di keranjang</p>}
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
}: ProductBrowserProps) {
  return (
    <div className="flex flex-col h-full">
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
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
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
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 animate-pulse">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded mb-2" />
                <div className="h-8 w-full bg-muted rounded mt-3" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={onAddToCart}
                isInCart={cartItemIds.has(product.id)}
                brandSlug={brandSlug}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
