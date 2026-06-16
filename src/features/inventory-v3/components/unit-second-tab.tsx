"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { RefreshCcw, AlertTriangle, CheckCircle2, DollarSign, Plus, Search, Edit, Eye } from "lucide-react";

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

interface UnitSecondItem {
  id: string;
  productName: string;
  condition: string;
  price: number;
  branchStocks: { branch: string; stock: number }[];
  imei: string;
  status: "Tersedia" | "Terjual" | "Dipesan";
}

const mockUnitSecond: UnitSecondItem[] = [
  { id: "us1", productName: "iPhone 13 Pro Max 256GB", condition: "Mulus", price: 12000000, branchStocks: [{ branch: "Klaten", stock: 1 }, { branch: "Semarang", stock: 0 }], imei: "351234567891239", status: "Tersedia" },
  { id: "us2", productName: "iPhone 12 128GB", condition: "Lecet", price: 7500000, branchStocks: [{ branch: "Klaten", stock: 2 }, { branch: "Semarang", stock: 1 }], imei: "351234567891240", status: "Tersedia" },
  { id: "us3", productName: "iPhone 11 Pro Max 256GB", condition: "Mulus", price: 8500000, branchStocks: [{ branch: "Klaten", stock: 0 }, { branch: "Semarang", stock: 0 }], imei: "351234567891241", status: "Dipesan" },
  { id: "us4", productName: "iPhone X 64GB", condition: "Body Baru", price: 4500000, branchStocks: [{ branch: "Klaten", stock: 1 }, { branch: "Semarang", stock: 2 }], imei: "351234567891242", status: "Tersedia" },
  { id: "us5", productName: "iPhone 14 Pro 256GB", condition: "Mulus", price: 14500000, branchStocks: [{ branch: "Klaten", stock: 0 }, { branch: "Semarang", stock: 0 }], imei: "351234567891243", status: "Terjual" },
];

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="destructive" className="text-[10px]">{stock}</Badge>;
  if (stock <= 1) return <Badge variant="secondary" className="text-[10px]">{stock}</Badge>;
  return <Badge variant="default" className="text-[10px]">{stock}</Badge>;
}

export function UnitSecondTab() {
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filtered = mockUnitSecond.filter((u) =>
    u.productName.toLowerCase().includes(search.toLowerCase()) ||
    u.imei.includes(search)
  );

  const totalUnit = mockUnitSecond.length;
  const tersedia = mockUnitSecond.filter((u) => u.status === "Tersedia").length;
  const terjual = mockUnitSecond.filter((u) => u.status === "Terjual").length;
  const totalValue = mockUnitSecond.reduce((sum, u) => sum + u.price * u.branchStocks.reduce((a, b) => a + b.stock, 0), 0);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Unit Second" value={String(totalUnit)} icon={RefreshCcw} helper="semua unit" />
        <SummaryCard label="Tersedia" value={String(tersedia)} icon={CheckCircle2} helper="siap jual" />
        <SummaryCard label="Terjual" value={String(terjual)} icon={DollarSign} helper="unit laku" />
        <SummaryCard label="Stock Value" value={formatRp(totalValue)} icon={AlertTriangle} helper="harga jual × stok" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Cari nama atau IMEI..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-xs" />
        </div>
        <Button size="sm" className="h-9 text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" /> Tambah Unit Second
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[2fr_80px_1fr_120px_140px_70px_80px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Product</span><span>Condition</span><span>Branch Stock</span><span>Price</span><span>IMEI</span><span>Status</span><span />
        </div>
        {filtered.map((item) => (
          <div key={item.id} className="grid grid-cols-[2fr_80px_1fr_120px_140px_70px_80px] gap-2 border-b px-3 py-2.5 text-xs transition-colors last:border-0 hover:bg-muted/20">
            <div className="flex items-center font-medium text-foreground">{item.productName}</div>
            <div className="flex items-center">
              <Badge variant="outline" className="text-[10px]">{item.condition}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {item.branchStocks.map((b) => (
                <span key={b.branch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {b.branch}: {stockBadge(b.stock)}
                </span>
              ))}
            </div>
            <div className="flex items-center tabular-nums text-foreground">{formatRp(item.price)}</div>
            <div className="flex items-center font-mono text-[10px] text-muted-foreground">{item.imei}</div>
            <div className="flex items-center">
              <Badge variant={item.status === "Tersedia" ? "default" : item.status === "Dipesan" ? "secondary" : "outline"} className="text-[10px]">{item.status}</Badge>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon" className="size-7"><Edit className="size-3.5" /></Button>
              <Button variant="ghost" size="icon" className="size-7"><Eye className="size-3.5" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">Tidak ada unit second ditemukan.</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Unit Second</DialogTitle>
            <DialogDescription>Mockup form — serial entry untuk unit bekas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">1. Informasi Unit</h4>
              <div className="space-y-2">
                <div><Label className="text-xs">Nama Produk</Label><Input className="mt-1 h-9 text-xs" placeholder="Contoh: iPhone 13 Pro Max 256GB" /></div>
                <div><Label className="text-xs">Kategori</Label>
                  <Select defaultValue="UNIT_SECOND">
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNIT_SECOND" className="text-xs">Unit Second</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">IMEI / Serial</Label><Input className="mt-1 h-9 text-xs" placeholder="Nomor IMEI..." /></div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">2. Kondisi Fisik</h4>
              <div className="space-y-2">
                <div><Label className="text-xs">Condition</Label>
                  <Select defaultValue="Mulus">
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mulus" className="text-xs">Mulus</SelectItem>
                      <SelectItem value="Lecet" className="text-xs">Lecet</SelectItem>
                      <SelectItem value="Body Baru" className="text-xs">Body Baru</SelectItem>
                      <SelectItem value="Bekas" className="text-xs">Bekas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">3. Harga &amp; Stok</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Harga Beli</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Harga Jual</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Stok Klaten</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
                <div><Label className="text-xs">Stok Semarang</Label><Input className="mt-1 h-9 text-xs" type="number" defaultValue="0" /></div>
              </div>
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
