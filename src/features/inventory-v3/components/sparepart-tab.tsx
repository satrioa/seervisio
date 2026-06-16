"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Wrench, AlertTriangle, AlertCircle, DollarSign, Plus, Search, Edit, Eye } from "lucide-react";

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

interface SparepartItem {
  id: string;
  productName: string;
  variantName: string;
  compatibleModel: string;
  quality: string;
  branchStocks: { branch: string; stock: number }[];
  costPrice: number;
  serviceSellingPrice: number;
  status: "Aktif" | "Nonaktif";
}

const mockSpareparts: SparepartItem[] = [
  { id: "sp1", productName: "LCD iPhone 11", variantName: "Original", compatibleModel: "iPhone 11", quality: "Original", branchStocks: [{ branch: "Klaten", stock: 5 }, { branch: "Semarang", stock: 2 }], costPrice: 180000, serviceSellingPrice: 350000, status: "Aktif" },
  { id: "sp2", productName: "Battery iPhone 13", variantName: "OEM", compatibleModel: "iPhone 13", quality: "OEM", branchStocks: [{ branch: "Klaten", stock: 3 }, { branch: "Semarang", stock: 0 }], costPrice: 85000, serviceSellingPrice: 200000, status: "Aktif" },
  { id: "sp3", productName: "Flexible Charger iPhone 12", variantName: "Original", compatibleModel: "iPhone 12", quality: "Original", branchStocks: [{ branch: "Klaten", stock: 1 }, { branch: "Semarang", stock: 0 }], costPrice: 45000, serviceSellingPrice: 120000, status: "Aktif" },
  { id: "sp4", productName: "Battery iPhone 11", variantName: "Original", compatibleModel: "iPhone 11", quality: "Original", branchStocks: [{ branch: "Klaten", stock: 0 }, { branch: "Semarang", stock: 0 }], costPrice: 95000, serviceSellingPrice: 220000, status: "Aktif" },
  { id: "sp5", productName: "Speaker iPhone X", variantName: "Original", compatibleModel: "iPhone X", quality: "Original", branchStocks: [{ branch: "Klaten", stock: 2 }, { branch: "Semarang", stock: 1 }], costPrice: 35000, serviceSellingPrice: 90000, status: "Nonaktif" },
];

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="destructive" className="text-[10px]">{stock}</Badge>;
  if (stock <= 2) return <Badge variant="secondary" className="text-[10px]">{stock}</Badge>;
  return <Badge variant="default" className="text-[10px]">{stock}</Badge>;
}

export function SparepartTab() {
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filtered = mockSpareparts.filter((s) =>
    s.productName.toLowerCase().includes(search.toLowerCase())
  );

  const totalSparepart = mockSpareparts.filter((s) => s.status === "Aktif").length;
  const lowStock = mockSpareparts.filter((s) =>
    s.status === "Aktif" && s.branchStocks.some((b) => b.stock > 0 && b.stock <= 1)
  ).length;
  const outOfStock = mockSpareparts.filter((s) =>
    s.status === "Aktif" && s.branchStocks.every((b) => b.stock === 0)
  ).length;
  const totalValue = mockSpareparts.reduce((sum, s) =>
    sum + s.costPrice * s.branchStocks.reduce((a, b) => a + b.stock, 0), 0
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Sparepart" value={String(totalSparepart)} icon={Wrench} helper="sparepart aktif" />
        <SummaryCard label="Low Stock" value={String(lowStock)} icon={AlertCircle} helper="stok ≤ 1" />
        <SummaryCard label="Out of Stock" value={String(outOfStock)} icon={AlertTriangle} helper="perlu restock" />
        <SummaryCard label="Stock Value" value={formatRp(totalValue)} icon={DollarSign} helper="harga modal × stok" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Cari sparepart..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-xs" />
        </div>
        <Button size="sm" className="h-9 text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" /> Tambah Sparepart
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[2fr_100px_120px_80px_1fr_100px_120px_80px_80px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Product</span><span>Variant</span><span>Compatible Model</span><span>Quality</span>
          <span>Branch Stock</span><span>Cost Price</span><span>Service Price</span><span>Status</span><span />
        </div>
        {filtered.map((item) => (
          <div key={item.id} className="grid grid-cols-[2fr_100px_120px_80px_1fr_100px_120px_80px_80px] gap-2 border-b px-3 py-2.5 text-xs transition-colors last:border-0 hover:bg-muted/20">
            <div className="flex items-center font-medium text-foreground">{item.productName}</div>
            <div className="flex items-center text-muted-foreground">{item.variantName}</div>
            <div className="flex items-center text-muted-foreground">{item.compatibleModel}</div>
            <div className="flex items-center">
              <Badge variant="outline" className="text-[10px]">{item.quality}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {item.branchStocks.map((b) => (
                <span key={b.branch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {b.branch}: {stockBadge(b.stock)}
                </span>
              ))}
            </div>
            <div className="flex items-center tabular-nums text-muted-foreground">{formatRp(item.costPrice)}</div>
            <div className="flex items-center tabular-nums text-foreground">{formatRp(item.serviceSellingPrice)}</div>
            <div className="flex items-center">
              <Badge variant={item.status === "Aktif" ? "default" : "outline"} className="text-[10px]">{item.status}</Badge>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon" className="size-7"><Edit className="size-3.5" /></Button>
              <Button variant="ghost" size="icon" className="size-7"><Eye className="size-3.5" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">Tidak ada sparepart ditemukan.</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Sparepart</DialogTitle>
            <DialogDescription>Mockup form — data tidak disimpan ke database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">1. Informasi Sparepart</h4>
              <div className="space-y-2">
                <div><Label className="text-xs">Nama Produk</Label><Input className="mt-1 h-9 text-xs" placeholder="Contoh: LCD iPhone 11" /></div>
                <div><Label className="text-xs">Kategori</Label>
                  <Select defaultValue="SPAREPART">
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPAREPART" className="text-xs">Sparepart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Compatible Model</Label><Input className="mt-1 h-9 text-xs" placeholder="Contoh: iPhone 11" /></div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">2. Spesifikasi</h4>
              <div className="space-y-2">
                <div><Label className="text-xs">Quality</Label>
                  <Select defaultValue="Original">
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Original" className="text-xs">Original</SelectItem>
                      <SelectItem value="OEM" className="text-xs">OEM</SelectItem>
                      <SelectItem value="Incell" className="text-xs">Incell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">SKU</Label><Input className="mt-1 h-9 text-xs" placeholder="Opsional" /></div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">3. Harga &amp; Stok</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Harga Modal</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Harga Jual Servis</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Stok Klaten</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Stok Semarang</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">4. Preview Variant</h4>
              <Badge variant="secondary" className="text-xs">Original</Badge>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button size="sm" onClick={() => setDialogOpen(false)}>Simpan Mockup</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
