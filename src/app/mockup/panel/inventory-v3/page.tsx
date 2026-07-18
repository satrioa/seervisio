"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Wrench, ShoppingBag, Smartphone, Package, Upload } from "lucide-react";
import { SparepartTab } from "@/features/inventory-v3/components/sparepart-tab";
import { ProdukTab } from "@/features/inventory-v3/components/produk-tab";
import { UnitBaruTab } from "@/features/inventory-v3/components/unit-baru-tab";
import { UnitSecondTab } from "@/features/inventory-v3/components/unit-second-tab";
import { ImportStockTab } from "@/features/inventory-v3/components/import-stock-tab";

export default function InventoryV3Page() {
  const brandSlug = useParams().brandSlug as string;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Inventory V3</h1>
        <p className="text-xs text-muted-foreground">
          Sistem inventory baru — paralel, tidak mengganggu inventory lama.
        </p>
      </div>

      <Tabs defaultValue="sparepart" className="w-full">
        <TabsList className="h-auto gap-0 border-b bg-transparent p-0">
          <TabsTrigger value="sparepart" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Wrench className="mr-1.5 size-3.5" /> Sparepart
          </TabsTrigger>
          <TabsTrigger value="produk" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <ShoppingBag className="mr-1.5 size-3.5" /> Produk
          </TabsTrigger>
          <TabsTrigger value="unit-baru" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Smartphone className="mr-1.5 size-3.5" /> Unit Baru
          </TabsTrigger>
          <TabsTrigger value="unit-second" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Package className="mr-1.5 size-3.5" /> Unit Second
          </TabsTrigger>
          <TabsTrigger value="import" className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground">
            <Upload className="mr-1.5 size-3.5" /> Import Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sparepart" className="mt-4 space-y-4">
          <SparepartTab />
        </TabsContent>
        <TabsContent value="produk" className="mt-4 space-y-4">
          <ProdukTab />
        </TabsContent>
        <TabsContent value="unit-baru" className="mt-4 space-y-4">
          <UnitBaruTab />
        </TabsContent>
        <TabsContent value="unit-second" className="mt-4 space-y-4">
          <UnitSecondTab />
        </TabsContent>
        <TabsContent value="import" className="mt-4 space-y-4">
          <ImportStockTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
