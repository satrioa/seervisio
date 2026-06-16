"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  Upload, AlertTriangle, CheckCircle2, Database, FileSpreadsheet,
  Trash2, ArrowRight, Clock, Plus,
} from "lucide-react";

interface ImportRow {
  id: string;
  productName: string;
  variant: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  branch: string;
  parseStatus: "valid" | "warning" | "error";
  errors: string[];
}

const mockParsedRows: ImportRow[] = [
  { id: "ir1", productName: "LCD iPhone 11", variant: "Original", quantity: 5, costPrice: 180000, sellingPrice: 350000, branch: "Klaten", parseStatus: "valid", errors: [] },
  { id: "ir2", productName: "Battery iPhone 13", variant: "OEM", quantity: 3, costPrice: 85000, sellingPrice: 200000, branch: "Semarang", parseStatus: "valid", errors: [] },
  { id: "ir3", productName: "Softcase iPhone 15", variant: "Black", quantity: 10, costPrice: 15000, sellingPrice: 35000, branch: "Klaten", parseStatus: "warning", errors: ["Stok existing: 8 — akan digabung"] },
  { id: "ir4", productName: "Unknown Product", variant: "-", quantity: 2, costPrice: 50000, sellingPrice: 100000, branch: "Klaten", parseStatus: "error", errors: ["Produk tidak ditemukan di database"] },
  { id: "ir5", productName: "Tempered Glass iPhone 13", variant: "Clear", quantity: 20, costPrice: 8000, sellingPrice: 20000, branch: "Semarang", parseStatus: "valid", errors: [] },
];

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export function ImportStockTab() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [parsedRows, setParsedRows] = React.useState<ImportRow[]>([]);
  const [isCommitted, setIsCommitted] = React.useState(false);
  const [importMethod, setImportMethod] = React.useState<"form" | "paste" | "file">("paste");

  const totalRows = parsedRows.length || mockParsedRows.length;
  const rows = parsedRows.length > 0 ? parsedRows : (isCommitted ? [] : mockParsedRows);
  const validRows = rows.filter((r) => r.parseStatus !== "error");
  const errorRows = rows.filter((r) => r.parseStatus === "error");
  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

  const handleCommit = () => {
    setParsedRows(
      (parsedRows.length > 0 ? parsedRows : mockParsedRows).map((r) => ({
        ...r,
        parseStatus: r.parseStatus === "error" ? "error" as const : "valid" as const,
        errors: r.parseStatus === "error" ? r.errors : [],
      }))
    );
    setIsCommitted(true);
  };

  const handleReset = () => {
    setParsedRows([]);
    setIsCommitted(false);
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Rows" value={String(totalRows)} icon={FileSpreadsheet} helper="baris di staging" />
        <SummaryCard label="Valid" value={String(validRows.length)} icon={CheckCircle2} helper="siap diimport" />
        <SummaryCard label="Errors" value={String(errorRows.length)} icon={AlertTriangle} helper="perlu diperbaiki" />
        <SummaryCard label="Total Qty" value={String(totalQuantity)} icon={Database} helper="unit akan masuk" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["paste", "form", "file"] as const).map((m) => (
            <Button key={m} size="sm" variant={importMethod === m ? "default" : "outline"} className="h-8 text-xs" onClick={() => setImportMethod(m)}>
              {m === "paste" ? "Paste" : m === "form" ? "Form" : "Upload File"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleReset} disabled={!isCommitted && parsedRows.length === 0}>
            <Trash2 className="mr-1 size-3.5" /> Reset
          </Button>
          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setDialogOpen(true)}>
            <Upload className="mr-1 size-3.5" /> Preview Import
          </Button>
        </div>
      </div>

      {importMethod === "paste" && (
        <div className="space-y-2">
          <Label className="text-xs">Paste data (format: nama, varian, qty, harga_modal, harga_jual, cabang)</Label>
          <Textarea className="text-xs" placeholder={`Contoh:\nLCD iPhone 11, Original, 5, 180000, 350000, Klaten\nBattery iPhone 13, OEM, 3, 85000, 200000, Semarang`} rows={5} />
          <div className="flex justify-end">
            <Button size="sm" className="h-8 text-xs"><ArrowRight className="mr-1 size-3.5" /> Parse</Button>
          </div>
        </div>
      )}

      {importMethod === "form" && (
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label className="text-xs">Nama Produk</Label><Input className="mt-1 h-9 text-xs" placeholder="Nama..." /></div>
            <div><Label className="text-xs">Variant</Label><Input className="mt-1 h-9 text-xs" placeholder="Variant..." /></div>
            <div><Label className="text-xs">Quantity</Label><Input className="mt-1 h-9 text-xs" type="number" placeholder="0" /></div>
            <div><Label className="text-xs">Harga Modal</Label><Input className="mt-1 h-9 text-xs" type="number" placeholder="0" /></div>
            <div><Label className="text-xs">Harga Jual</Label><Input className="mt-1 h-9 text-xs" type="number" placeholder="0" /></div>
            <div><Label className="text-xs">Cabang</Label>
              <Select defaultValue="Klaten">
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Klaten" className="text-xs">Klaten</SelectItem>
                  <SelectItem value="Semarang" className="text-xs">Semarang</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" className="h-8 text-xs"><Plus className="mr-1 size-3.5" /> Tambah ke Staging</Button>
          </div>
        </div>
      )}

      {importMethod === "file" && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-8">
          <Upload className="mb-2 size-8 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Seret file Excel/CSV ke sini, atau klik untuk upload</p>
          <p className="text-[10px] text-muted-foreground">Format: .xlsx, .xls, .csv</p>
          <Button size="sm" variant="outline" className="mt-3 h-8 text-xs">Pilih File</Button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">Staging Table</h3>
          {rows.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{rows.length} baris</span>
          )}
        </div>
        <div className="mt-2 overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-[2fr_100px_60px_1fr_1fr_80px_60px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Product</span><span>Variant</span><span>Qty</span><span>Harga Modal</span><span>Harga Jual</span><span>Cabang</span><span>Status</span>
          </div>
          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              {isCommitted ? "Import berhasil dikomit." : "Belum ada data. Paste, isi form, atau upload file untuk memulai."}
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[2fr_100px_60px_1fr_1fr_80px_60px] gap-2 border-b px-3 py-2 text-xs last:border-0 hover:bg-muted/20">
                <div className="flex items-center font-medium text-foreground">{row.productName}</div>
                <div className="flex items-center text-muted-foreground">{row.variant}</div>
                <div className="flex items-center tabular-nums">{row.quantity}</div>
                <div className="flex items-center tabular-nums text-muted-foreground">{formatRp(row.costPrice)}</div>
                <div className="flex items-center tabular-nums text-foreground">{formatRp(row.sellingPrice)}</div>
                <div className="flex items-center text-muted-foreground">{row.branch}</div>
                <div className="flex items-center">
                  {row.parseStatus === "valid" && <Badge variant="default" className="text-[10px] bg-green-600">Valid</Badge>}
                  {row.parseStatus === "warning" && <Badge variant="secondary" className="text-[10px]">Warning</Badge>}
                  {row.parseStatus === "error" && <Badge variant="destructive" className="text-[10px]">Error</Badge>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!isCommitted && rows.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" className="h-9 text-xs" onClick={handleCommit}>
            <Database className="mr-1.5 size-3.5" /> Commit Import ({validRows.length} row{validRows.length !== 1 ? "s" : ""})
          </Button>
        </div>
      )}

      {isCommitted && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="size-4" />
          Import berhasil dikomit! Data sudah masuk ke inventory V3.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Import</DialogTitle>
            <DialogDescription>Mockup preview — validasi &amp; summary sebelum commit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-2"><span className="text-muted-foreground">Total Baris</span><p className="font-semibold">{totalRows}</p></div>
              <div className="rounded-lg border bg-muted/30 p-2"><span className="text-muted-foreground">Valid</span><p className="font-semibold text-green-600">{validRows.length}</p></div>
              <div className="rounded-lg border bg-muted/30 p-2"><span className="text-muted-foreground">Warning</span><p className="font-semibold text-yellow-600">{rows.filter((r) => r.parseStatus === "warning").length}</p></div>
              <div className="rounded-lg border bg-muted/30 p-2"><span className="text-muted-foreground">Error</span><p className="font-semibold text-destructive">{errorRows.length}</p></div>
            </div>
            {errorRows.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
                <p className="mb-1 font-medium text-destructive">Errors:</p>
                {errorRows.map((r) => (
                  <p key={r.id} className="text-muted-foreground">• {r.productName}: {r.errors.join(", ")}</p>
                ))}
              </div>
            )}
            <div className="rounded-lg border bg-muted/20 p-2 text-xs">
              <span className="font-medium">Summary:</span>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>Produk baru akan dibuat: ~{Math.ceil(validRows.length * 0.6)}</li>
                <li>Stok akan ditambahkan ke {validRows.filter((r) => r.parseStatus === "valid").length} variant</li>
                <li>Batch import akan tercatat di inventory_import_batches</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(false)}>Tutup</Button>
            <Button size="sm" onClick={() => { setDialogOpen(false); handleCommit(); }}>
              <Database className="mr-1.5 size-3.5" /> Commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
