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
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Smartphone, AlertTriangle, Package, DollarSign, Plus, Search, Edit, Eye, X, GripVertical, Trash2 } from "lucide-react";

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

interface UnitBaruItem {
  id: string;
  productName: string;
  variantLabel: string;
  branchStocks: { branch: string; stock: number }[];
  costPrice: number;
  sellingPrice: number;
  imei: string;
  status: "Tersedia" | "Terjual" | "Dipesan";
}

const mockUnitBaru: UnitBaruItem[] = [
  { id: "ub1", productName: "iPhone 15 Pro Max", variantLabel: "Natural Titanium / 256GB", branchStocks: [{ branch: "Klaten", stock: 2 }, { branch: "Semarang", stock: 1 }], costPrice: 18000000, sellingPrice: 22000000, imei: "351234567891234", status: "Tersedia" },
  { id: "ub2", productName: "iPhone 15 Pro Max", variantLabel: "White Titanium / 256GB", branchStocks: [{ branch: "Klaten", stock: 1 }, { branch: "Semarang", stock: 0 }], costPrice: 18000000, sellingPrice: 22000000, imei: "351234567891235", status: "Tersedia" },
  { id: "ub3", productName: "iPhone 15", variantLabel: "Black / 128GB", branchStocks: [{ branch: "Klaten", stock: 3 }, { branch: "Semarang", stock: 2 }], costPrice: 14000000, sellingPrice: 17000000, imei: "351234567891236", status: "Tersedia" },
  { id: "ub4", productName: "iPhone 15", variantLabel: "Pink / 128GB", branchStocks: [{ branch: "Klaten", stock: 0 }, { branch: "Semarang", stock: 1 }], costPrice: 14000000, sellingPrice: 17000000, imei: "351234567891237", status: "Dipesan" },
  { id: "ub5", productName: "iPhone 14 Pro", variantLabel: "Deep Purple / 256GB", branchStocks: [{ branch: "Klaten", stock: 1 }, { branch: "Semarang", stock: 0 }], costPrice: 15500000, sellingPrice: 19000000, imei: "351234567891238", status: "Terjual" },
];

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="destructive" className="text-[10px]">{stock}</Badge>;
  if (stock <= 1) return <Badge variant="secondary" className="text-[10px]">{stock}</Badge>;
  return <Badge variant="default" className="text-[10px]">{stock}</Badge>;
}

interface VariantGroup {
  id: string;
  name: string;
  options: string[];
}

export function UnitBaruTab() {
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [groups, setGroups] = React.useState<VariantGroup[]>([]);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newOptionInputs, setNewOptionInputs] = React.useState<Record<string, string>>({});

  const filtered = mockUnitBaru.filter((u) =>
    u.productName.toLowerCase().includes(search.toLowerCase()) ||
    u.variantLabel.toLowerCase().includes(search.toLowerCase()) ||
    u.imei.includes(search)
  );

  const totalUnit = mockUnitBaru.length;
  const tersedia = mockUnitBaru.filter((u) => u.status === "Tersedia").length;
  const totalStock = mockUnitBaru.reduce((sum, u) => sum + u.branchStocks.reduce((a, b) => a + b.stock, 0), 0);
  const totalValue = mockUnitBaru.reduce((sum, u) => sum + u.costPrice * u.branchStocks.reduce((a, b) => a + b.stock, 0), 0);

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setGroups((prev) => [...prev, { id: crypto.randomUUID(), name, options: [] }]);
    setNewGroupName("");
  };

  const removeGroup = (id: string) => setGroups((prev) => prev.filter((g) => g.id !== id));

  const addOption = (groupId: string) => {
    const val = (newOptionInputs[groupId] || "").trim();
    if (!val) return;
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, options: [...g.options, val] } : g));
    setNewOptionInputs((prev) => ({ ...prev, [groupId]: "" }));
  };

  const removeOption = (groupId: string, option: string) =>
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, options: g.options.filter((o) => o !== option) } : g));

  type ComboItem = string[];
  const rawCombos: ComboItem[] = groups.length === 0
    ? [[]]
    : groups.reduce<ComboItem[]>((acc, g) => acc.flatMap((c) => g.options.map((o) => [...c, o])), [[]]);
  const combinations = groups.length === 0
    ? [{ label: "Default (no variants)", combo: rawCombos[0] }]
    : rawCombos.map((c) => ({ label: c.join(" / "), combo: c }));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Unit" value={String(totalUnit)} icon={Smartphone} helper="semua unit" />
        <SummaryCard label="Tersedia" value={String(tersedia)} icon={Package} helper="unit siap jual" />
        <SummaryCard label="Total Stock" value={String(totalStock)} icon={DollarSign} helper="semua cabang" />
        <SummaryCard label="Stock Value" value={formatRp(totalValue)} icon={AlertTriangle} helper="harga modal × stok" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Cari nama, varian, atau IMEI..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-xs" />
        </div>
        <Button size="sm" className="h-9 text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" /> Tambah Unit Baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[2fr_120px_1fr_120px_120px_130px_70px_80px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Product</span><span>Variant</span><span>Branch Stock</span><span>Cost Price</span><span>Selling Price</span><span>IMEI</span><span>Status</span><span />
        </div>
        {filtered.map((item) => (
          <div key={item.id} className="grid grid-cols-[2fr_120px_1fr_120px_120px_130px_70px_80px] gap-2 border-b px-3 py-2.5 text-xs transition-colors last:border-0 hover:bg-muted/20">
            <div className="flex items-center font-medium text-foreground">{item.productName}</div>
            <div className="flex items-center text-muted-foreground">{item.variantLabel}</div>
            <div className="flex items-center gap-1.5">
              {item.branchStocks.map((b) => (
                <span key={b.branch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {b.branch}: {stockBadge(b.stock)}
                </span>
              ))}
            </div>
            <div className="flex items-center tabular-nums text-muted-foreground">{formatRp(item.costPrice)}</div>
            <div className="flex items-center tabular-nums text-foreground">{formatRp(item.sellingPrice)}</div>
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
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">Tidak ada unit ditemukan.</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Unit Baru</DialogTitle>
            <DialogDescription>Mockup — variant builder dengan dynamic group/option.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-sm font-medium">1. Informasi Produk</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Nama Produk</Label><Input className="mt-1 h-9 text-xs" placeholder="Contoh: iPhone 15 Pro Max" /></div>
                <div><Label className="text-xs">Kategori</Label>
                  <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring">
                    <option>UNIT</option>
                  </select>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">2. Dynamic Variant Groups</h4>
              <p className="mb-3 text-[10px] text-muted-foreground">Tentukan grup varian seperti Color, Storage, RAM, Chip — semuanya dinamis.</p>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.id} className="rounded-lg border bg-muted/10 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{g.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeGroup(g.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {g.options.map((o) => (
                        <Badge key={o} variant="secondary" className="text-[10px] pr-1">
                          {o}
                          <button onClick={() => removeOption(g.id, o)} className="ml-1 hover:text-destructive">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-7 text-[10px]"
                        placeholder="Tambah opsi..."
                        value={newOptionInputs[g.id] || ""}
                        onChange={(e) => setNewOptionInputs((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(g.id); } }}
                      />
                      <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => addOption(g.id)}>+</Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nama grup baru (contoh: Color, Storage)..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGroup(); } }}
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={addGroup}>Tambah Grup</Button>
                </div>
              </div>
            </div>
            {groups.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-medium">3. Generated Variants</h4>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-1 gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_80px_80px_80px_60px]">
                      <span>Kombinasi</span><span>Harga Modal</span><span>Harga Jual</span><span>Stok</span><span>IMEI</span>
                    </div>
                    {combinations.map((combo, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-2 border-b px-3 py-2 text-xs last:border-0 sm:grid-cols-[1fr_80px_80px_80px_60px]">
                        <div className="flex items-center font-medium text-foreground">
                          {combo.label}
                        </div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" type="number" defaultValue="0" /></div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" type="number" defaultValue="0" /></div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" type="number" defaultValue="0" /></div>
                        <div className="flex items-center"><Input className="h-7 text-[10px]" placeholder="IMEI..." /></div>
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
