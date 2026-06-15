"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getPurchaseDetailAction,
  type PurchaseRow,
} from "@/server/actions/inventory.actions";
import { Loader2, FileText, Building2, User, Wallet, Package } from "lucide-react";

interface PurchaseDetailDrawerProps {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PAID: { label: "Lunas", variant: "default" },
  UNPAID: { label: "Belum Dibayar", variant: "secondary" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
};

export function PurchaseDetailDrawer({ purchaseId, open, onOpenChange }: PurchaseDetailDrawerProps) {
  const [purchase, setPurchase] = React.useState<PurchaseRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !purchaseId) {
      setPurchase(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const brandSlug = window.location.pathname.split("/")[1];
    getPurchaseDetailAction(brandSlug, purchaseId).then((res) => {
      if (res.success) {
        setPurchase(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, [open, purchaseId]);

  const statusInfo = purchase ? STATUS_LABELS[purchase.status] ?? { label: purchase.status, variant: "outline" as const } : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-xl lg:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detail Belanja Stok</SheetTitle>
          <SheetDescription>Detail purchase order</SheetDescription>
        </SheetHeader>

        {loading && !purchase && (
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {purchase && !loading && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary shrink-0" />
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      {purchase.purchaseNumber}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(purchase.purchaseDate).toLocaleDateString("id-ID", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                </div>
                {statusInfo && (
                  <Badge variant={statusInfo.variant} className="shrink-0 text-[10px]">
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 px-6 py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cabang</p>
                    <p className="text-xs font-medium text-foreground truncate">{purchase.branchName ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Supplier</p>
                    <p className="text-xs font-medium text-foreground truncate">{purchase.supplierName ?? "—"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pembayaran</p>
                    <p className="text-xs font-medium text-foreground truncate">{purchase.paymentAccountName ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dibuat Oleh</p>
                    <p className="text-xs font-medium text-foreground truncate">{purchase.createdByName ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {purchase.notes && (
              <div className="px-6 pb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Catatan</p>
                <p className="text-xs text-muted-foreground">{purchase.notes}</p>
              </div>
            )}

            <Separator />

            {/* Items */}
            <div className="px-6 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Package className="size-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Item ({purchase.items?.length ?? 0})
                </p>
              </div>

              {purchase.items && purchase.items.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  <div className="grid grid-cols-[1fr_60px_100px_100px] gap-2 px-3 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground">
                    <span>Item</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Harga</span>
                    <span className="text-right">Subtotal</span>
                  </div>
                  {purchase.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_60px_100px_100px] gap-2 px-3 py-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.itemNameSnapshot}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.skuSnapshot && `SKU: ${item.skuSnapshot}`}
                          {item.skuSnapshot && item.barcodeSnapshot && " · "}
                          {item.barcodeSnapshot}
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <span className="tabular-nums text-foreground">{item.quantity}</span>
                        <span className="text-[10px] text-muted-foreground">{item.unitSnapshot}</span>
                      </div>
                      <div className="flex flex-col items-end justify-center">
                        <span className="tabluar-nums text-foreground">{formatRp(item.unitCostSnapshot)}</span>
                      </div>
                      <div className="flex items-center justify-end font-medium tabular-nums text-foreground">
                        {formatRp(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada item</p>
              )}
            </div>

            {/* Total */}
            <div className="border-t px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-base font-bold tabular-nums text-foreground">
                  {formatRp(purchase.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
