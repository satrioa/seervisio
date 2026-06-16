"use client";

import * as React from "react";
import { Search, Plus, X, Loader2, Minus, ShoppingBag, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  searchServicesV4Action,
  searchServiceSparepartsV4Action,
  useSparepartForServiceV4Action,
  listServiceSparepartUsageV4Action,
} from "@/server/actions/inventory-v4.actions";
import type {
  ServiceSparepartSearchRow,
  PurchaseVariantSearchRow,
  ServiceSparepartUsageV4Row,
  UseSparepartForServiceV4Input,
  ServiceSparepartUsageItemInput,
} from "@/server/domain/inventory-v4.types";
import { formatCurrency } from "@/components/services/service-data";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

interface ServiceSparepartUsageV4SectionProps {
  brandSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CartItem {
  tempId: string;
  variantId: string;
  productId: string;
  variantName: string;
  productName: string;
  quantity: number;
  maxStock: number;
  unit: string;
}

export function ServiceSparepartUsageV4Section({
  brandSlug,
  open,
  onOpenChange,
  onSuccess,
}: ServiceSparepartUsageV4SectionProps) {
  const [step, setStep] = React.useState<"service" | "items" | "preview">("service");

  const [serviceSearch, setServiceSearch] = React.useState("");
  const [services, setServices] = React.useState<ServiceSparepartSearchRow[]>([]);
  const [serviceLoading, setServiceLoading] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<ServiceSparepartSearchRow | null>(null);

  const [spSearch, setSpSearch] = React.useState("");
  const [spResults, setSpResults] = React.useState<PurchaseVariantSearchRow[]>([]);
  const [spLoading, setSpLoading] = React.useState(false);

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const [usageHistory, setUsageHistory] = React.useState<ServiceSparepartUsageV4Row[]>([]);

  const reset = React.useCallback(() => {
    setStep("service");
    setServiceSearch("");
    setServices([]);
    setSelectedService(null);
    setSpSearch("");
    setSpResults([]);
    setCart([]);
    setNotes("");
    setUsageHistory([]);
  }, []);

  const doSearchServices = React.useCallback(async (q: string) => {
    setServiceLoading(true);
    const res = await searchServicesV4Action(brandSlug, "", q || undefined);
    if (res.success) setServices(res.data ?? []);
    setServiceLoading(false);
  }, [brandSlug]);

  React.useEffect(() => {
    if (open) { reset(); }
  }, [open, reset]);

  React.useEffect(() => {
    if (!open || step !== "service") return;
    const timer = setTimeout(() => {
      if (serviceSearch) doSearchServices(serviceSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [serviceSearch, step, open, doSearchServices]);

  const handleSelectService = React.useCallback(async (svc: ServiceSparepartSearchRow) => {
    setSelectedService(svc);
    setStep("items");
    const res = await listServiceSparepartUsageV4Action(brandSlug, svc.serviceId);
    if (res.success) setUsageHistory(res.data ?? []);
  }, [brandSlug]);

  const doSearchSpareparts = React.useCallback(async (q: string) => {
    if (!selectedService) return;
    setSpLoading(true);
    const res = await searchServiceSparepartsV4Action(brandSlug, selectedService.branchId, q || undefined);
    if (res.success) setSpResults(res.data ?? []);
    setSpLoading(false);
  }, [brandSlug, selectedService]);

  React.useEffect(() => {
    if (!open || step !== "items") return;
    const timer = setTimeout(() => {
      doSearchSpareparts(spSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [spSearch, step, open, doSearchSpareparts]);

  const addToCart = (item: PurchaseVariantSearchRow) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.variantId === item.variantId);
      if (existing) {
        return prev.map((c) =>
          c.variantId === item.variantId ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          tempId: crypto.randomUUID(),
          variantId: item.variantId,
          productId: item.productId,
          variantName: item.variantName,
          productName: item.productName,
          quantity: 1,
          maxStock: item.currentStock,
          unit: item.unit,
        },
      ];
    });
  };

  const updateCartQty = (tempId: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, quantity: Math.max(1, qty) } : c)),
    );
  };

  const removeFromCart = (tempId: string) => {
    setCart((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (!selectedService) return;
    if (cart.length === 0) {
      triggerDynamicIslandFeedback({ title: "Tambahkan minimal satu sparepart.", type: "error" });
      return;
    }
    setSubmitting(true);
    const input: UseSparepartForServiceV4Input = {
      branchId: selectedService.branchId,
      serviceId: selectedService.serviceId,
      notes: notes || null,
      items: cart.map((c): ServiceSparepartUsageItemInput => ({
        variantId: c.variantId,
        quantity: c.quantity,
      })),
    };
    const res = await useSparepartForServiceV4Action(brandSlug, input);
    setSubmitting(false);
    if (res.success) {
      triggerDynamicIslandFeedback({ title: `${res.data!.usageCount} item sparepart dicatat.`, type: "success" });
      onOpenChange(false);
      onSuccess?.();
    } else {
      triggerDynamicIslandFeedback({ title: res.error ?? "Gagal mencatat pemakaian sparepart.", type: "error" });
    }
  };

  const totalCost = cart.reduce((sum, c) => {
    return sum + c.quantity * 0;
  }, 0);

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-4" />
            Pemakaian Sparepart Servis
          </DialogTitle>
          <DialogDescription>
            {selectedService
              ? `${selectedService.customerName ?? "-"} — ${selectedService.deviceBrand ?? ""} ${selectedService.deviceModel ?? ""} (${selectedService.serviceNumber})`
              : "Cari servis lalu pilih sparepart V4"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "service" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nomor servis atau nama pelanggan..."
                  className="pl-8"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {serviceLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!serviceLoading && services.length === 0 && serviceSearch && (
                <p className="py-8 text-center text-sm text-muted-foreground">Servis tidak ditemukan.</p>
              )}

              {!serviceLoading && services.length === 0 && !serviceSearch && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ketik untuk mencari servis dengan status Perbaikan atau QC.
                </p>
              )}

              <div className="space-y-1.5">
                {services.map((svc) => (
                  <button
                    key={svc.serviceId}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                    onClick={() => handleSelectService(svc)}
                  >
                    <Wrench className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{svc.serviceNumber}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {svc.customerName} — {svc.deviceBrand} {svc.deviceModel}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {svc.currentStatus}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "items" && selectedService && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari sparepart (nama, SKU, barcode)..."
                  className="pl-8"
                  value={spSearch}
                  onChange={(e) => setSpSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="font-medium">Servis</div>
                <div className="col-span-2">{selectedService.serviceNumber}</div>
                <div className="font-medium">Pelanggan</div>
                <div className="col-span-2">{selectedService.customerName ?? "-"}</div>
                <div className="font-medium">Unit</div>
                <div className="col-span-2">{selectedService.deviceBrand} {selectedService.deviceModel}</div>
              </div>

              <Separator />

              {usageHistory.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground">Riwayat Pemakaian (V4)</h4>
                  <div className="space-y-1">
                    {usageHistory.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{u.itemNameSnapshot}</span>
                          {u.variantNameSnapshot && (
                            <span className="text-muted-foreground"> — {u.variantNameSnapshot}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-muted-foreground">x{u.quantity}</span>
                          <span className="text-muted-foreground">{formatCurrency(u.sellingPriceSnapshot)}</span>
                          <span className="text-muted-foreground">
                            = {formatCurrency(u.sellingPriceSnapshot * u.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {spLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!spLoading && spResults.length === 0 && spSearch && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Sparepart tidak ditemukan.</p>
                )}
                {spResults.map((sp) => (
                  <button
                    key={sp.variantId}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                    onClick={() => addToCart(sp)}
                    disabled={sp.currentStock <= 0}
                  >
                    <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{sp.productName}</div>
                      <div className="text-muted-foreground truncate">
                        {sp.variantName}
                        {sp.sku && <span> · {sp.sku}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-medium">{formatCurrency(sp.sellingPrice)}</div>
                      <div className="text-muted-foreground">
                        Stok:{" "}
                        <span className={sp.currentStock <= 0 ? "text-destructive font-medium" : ""}>
                          {sp.currentStock}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {cart.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium">Keranjang ({totalItems} item)</h4>
                    {cart.map((c) => (
                      <div key={c.tempId} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{c.productName}</div>
                          <div className="text-muted-foreground truncate">{c.variantName}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
                            onClick={() => updateCartQty(c.tempId, c.quantity - 1)}
                            disabled={c.quantity <= 1}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-6 text-center font-medium">{c.quantity}</span>
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
                            onClick={() => updateCartQty(c.tempId, c.quantity + 1)}
                            disabled={c.quantity >= c.maxStock}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(c.tempId)}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Catatan (opsional)</Label>
                    <Textarea
                      placeholder="Catatan pemakaian sparepart..."
                      className="min-h-[60px] text-xs"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setStep("service")}
                    >
                      Kembali
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={handleSubmit}
                      disabled={submitting || cart.length === 0}
                    >
                      {submitting ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <ShoppingBag className="mr-1.5 size-3.5" />
                      )}
                      Catat Pemakaian ({totalItems} item)
                    </Button>
                  </div>
                </>
              )}

              {cart.length === 0 && (
                <div className="flex justify-center pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setStep("service")}
                  >
                    Ganti Servis
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
