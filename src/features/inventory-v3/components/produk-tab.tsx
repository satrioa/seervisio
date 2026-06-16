"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { ShoppingBag, AlertTriangle, Package, DollarSign, Plus, Search, Edit, Eye, X } from "lucide-react";

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

interface ProdukItem {
  id: string;
  productName: string;
  variants: string[];
  branchStocks: { branch: string; stock: number }[];
  priceRange: { min: number; max: number };
  status: "Aktif" | "Nonaktif";
}

const mockProduk: ProdukItem[] = [
  { id: "pr1", productName: "Batok Cas Ugreen", variants: ["11 pcs"], branchStocks: [{ branch: "Klaten", stock: 11 }, { branch: "Semarang", stock: 5 }], priceRange: { min: 15000, max: 15000 }, status: "Aktif" },
  { id: "pr2", productName: "Softcase iPhone 15", variants: ["Black", "Clear", "Blue"], branchStocks: [{ branch: "Klaten", stock: 8 }, { branch: "Semarang", stock: 3 }], priceRange: { min: 25000, max: 35000 }, status: "Aktif" },
  { id: "pr3", productName: "Tempered Glass iPhone 13", variants: ["iPhone 13", "iPhone 14"], branchStocks: [{ branch: "Klaten", stock: 15 }, { branch: "Semarang", stock: 7 }], priceRange: { min: 15000, max: 20000 }, status: "Aktif" },
  { id: "pr4", productName: "Charger 20W Original", variants: ["White", "Black"], branchStocks: [{ branch: "Klaten", stock: 2 }, { branch: "Semarang", stock: 0 }], priceRange: { min: 120000, max: 120000 }, status: "Aktif" },
  { id: "pr5", productName: "USB Cable Lightning", variants: ["1m", "2m"], branchStocks: [{ branch: "Klaten", stock: 0 }, { branch: "Semarang", stock: 0 }], priceRange: { min: 25000, max: 35000 }, status: "Nonaktif" },
];

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="destructive" className="text-[10px]">{stock}</Badge>;
  if (stock <= 2) return <Badge variant="secondary" className="text-[10px]">{stock}</Badge>;
  return <Badge variant="default" className="text-[10px]">{stock}</Badge>;
}

interface ChipInputProps {
  label: string;
  chips: string[];
  selected: string[];
  onToggle: (value: string) => void;
}
function ChipInput({ label, chips, selected, onToggle }: ChipInputProps) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onToggle(c)}
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
              selected.includes(c)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c}
            {selected.includes(c) && <X className="ml-1 size-3" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProdukTab() {
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [variasiAktif, setVariasiAktif] = React.useState(true);
  const [selectedColors, setSelectedColors] = React.useState<string[]>(["Black", "White"]);
  const [selectedSizes, setSelectedSizes] = React.useState<string[]>(["M"]);

  const filtered = mockProduk.filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase())
  );

  const totalProduk = mockProduk.length;
  const activeProduk = mockProduk.filter((p) => p.status === "Aktif").length;
  const totalStock = mockProduk.reduce((sum, p) => sum + p.branchStocks.reduce((a, b) => a + b.stock, 0), 0);
  const lowStock = mockProduk.filter((p) =>
    p.status === "Aktif" && p.branchStocks.some((b) => b.stock > 0 && b.stock <= 2)
  ).length;

  const generatedVariants = selectedColors.flatMap((color) =>
    selectedSizes.map((size) => ({ combo: `${color} / ${size}`, color, size }))
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Produk" value={String(totalProduk)} icon={ShoppingBag} helper="semua produk" />
        <SummaryCard label="Active Products" value={String(activeProduk)} icon={Package} helper="produk aktif" />
        <SummaryCard label="Total Stock" value={String(totalStock)} icon={DollarSign} helper="semua cabang" />
        <SummaryCard label="Low Stock" value={String(lowStock)} icon={AlertTriangle} helper="stok menipis" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Cari produk..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-xs" />
        </div>
        <Button size="sm" className="h-9 text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" /> Tambah Produk
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[2fr_120px_1fr_120px_80px_80px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Product</span><span>Variants</span><span>Branch Stock</span><span>Price Range</span><span>Status</span><span />
        </div>
        {filtered.map((item) => (
          <div key={item.id} className="grid grid-cols-[2fr_120px_1fr_120px_80px_80px] gap-2 border-b px-3 py-2.5 text-xs transition-colors last:border-0 hover:bg-muted/20">
            <div className="flex items-center font-medium text-foreground">{item.productName}</div>
            <div className="flex items-center gap-1 flex-wrap">
              {item.variants.map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {item.branchStocks.map((b) => (
                <span key={b.branch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {b.branch}: {stockBadge(b.stock)}
                </span>
              ))}
            </div>
            <div className="flex items-center tabular-nums text-muted-foreground">
              {formatRp(item.priceRange.min)}{item.priceRange.min !== item.priceRange.max ? ` - ${formatRp(item.priceRange.max)}` : ""}
            </div>
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
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">Tidak ada produk ditemukan.</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Produk</DialogTitle>
            <DialogDescription>Shopee-style product form — mockup, tidak tersimpan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-sm font-medium">1. Informasi Produk</h4>
              <div className="space-y-2">
                <div><Label className="text-xs">Nama Produk</Label><Input className="mt-1 h-9 text-xs" placeholder="Contoh: Softcase iPhone 15" /></div>
                <div><Label className="text-xs">Kategori</Label>
                  <Select defaultValue="PRODUCT">
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCT" className="text-xs">Produk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Brand</Label><Input className="mt-1 h-9 text-xs" placeholder="Contoh: Ugreen" /></div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">2. Spesifikasi</h4>
              <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">Brand:</span> Apple</p>
                <p><span className="font-medium text-foreground">Material:</span> Silicone</p>
                <p><span className="font-medium text-foreground">Garansi:</span> 30 Hari</p>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">3. Deskripsi</h4>
              <Textarea className="mt-1 text-xs" placeholder="Deskripsi produk..." rows={3} />
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">4. Informasi Penjualan</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Harga Modal</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Harga Jual</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Switch checked={variasiAktif} onCheckedChange={setVariasiAktif} id="variasi-toggle" />
                <Label htmlFor="variasi-toggle" className="text-xs">Aktifkan Variasi</Label>
              </div>
            </div>
            {variasiAktif && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">5. Variasi</h4>
                  <div className="space-y-3">
                    <ChipInput label="Color" chips={["Black", "White", "Blue", "Clear"]} selected={selectedColors} onToggle={(v) => setSelectedColors((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])} />
                    <ChipInput label="Size" chips={["S", "M", "L"]} selected={selectedSizes} onToggle={(v) => setSelectedSizes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">6. Daftar Variasi / SKU</h4>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[1fr_100px_100px_100px_80px_60px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <span>Kombinasi</span><span>SKU</span><span>Harga Modal</span><span>Harga Jual</span><span>Stok</span><span>Active</span>
                    </div>
                    {generatedVariants.map((v) => (
                      <div key={v.combo} className="grid grid-cols-[1fr_100px_100px_100px_80px_60px] gap-2 border-b px-3 py-2 text-xs last:border-0">
                        <div className="flex items-center font-medium text-foreground">{v.combo}</div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" defaultValue={`SC-${v.color.substring(0, 3).toUpperCase()}-${v.size}`} /></div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" type="number" defaultValue="15000" /></div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" type="number" defaultValue="25000" /></div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" type="number" defaultValue="5" /></div>
                        <div className="flex items-center justify-center"><input type="checkbox" defaultChecked className="size-4" /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
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
