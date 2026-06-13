// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  User,
  ArrowLeft,
  CheckCircle2,
  Receipt,
  RepeatIcon,
  Wallet,
} from "lucide-react";
import type { PosCartItem, PosTradeIn } from "@/domain/pos/types";
import { calculateLineTotal, isSerializedDevice } from "@/domain/pos/calculate-pos";

function ScrollArea({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`${className ?? ""} overflow-auto`}>{children}</div>;
}

/* ─── Helpers ─── */

function formatPrice(v: number): string {
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}

/* ─── Cart Item Row ─── */

function CartItemRow({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: PosCartItem;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  const isDevice = isSerializedDevice(item);
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3 text-xs text-muted-foreground">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.productName}</span>
          <button
            onClick={onRemove}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {item.selectedUnit && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.selectedUnit.imei && (
              <span className="text-[10px] text-muted-foreground">IMEI: {item.selectedUnit.imei}</span>
            )}
            {item.selectedUnit.storage && (
              <Badge variant="outline" className="text-[10px] px-1">{item.selectedUnit.storage}</Badge>
            )}
            {item.selectedUnit.conditionGrade && (
              <Badge variant="outline" className="text-[10px] px-1">{item.selectedUnit.conditionGrade}</Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          {isDevice ? (
            <span className="text-xs text-muted-foreground">Qty: 1</span>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={item.quantity <= 1}
                onClick={() => onUpdateQty(item.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => onUpdateQty(item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-semibold">{formatPrice(calculateLineTotal(item))}</p>
            {item.quantity > 1 && (
              <p className="text-[10px] text-muted-foreground">{formatPrice(item.unitPrice)} /pcs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Trade-in Section ─── */

function TradeInSection({
  tradeIn,
  allowTradeIn,
  onSet,
}: {
  tradeIn?: PosTradeIn;
  allowTradeIn: boolean;
  onSet: (t?: PosTradeIn) => void;
}) {
  const [open, setOpen] = React.useState(false);

  if (!allowTradeIn) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground">
        Tukar tambah hanya tersedia untuk penjualan unit/device.
      </div>
    );
  }

  if (tradeIn) {
    return (
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">Tukar Tambah</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onSet(undefined)}>
            Hapus
          </Button>
        </div>
        <p className="text-sm">{tradeIn.deviceBrand} {tradeIn.deviceModel}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">Nilai tukar</span>
          <span className="text-sm font-semibold text-destructive">-{formatPrice(tradeIn.appraisalValue)}</span>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setOpen(true)}>
        + Tambah Tukar Tambah
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Data Tukar Tambah</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
      <TradeInForm onSubmit={(t) => { onSet(t); setOpen(false); }} />
    </div>
  );
}

function TradeInForm({ onSubmit }: { onSubmit: (t: PosTradeIn) => void }) {
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");
  const [storage, setStorage] = React.useState("");
  const [color, setColor] = React.useState("");
  const [imei, setImei] = React.useState("");
  const [condition, setCondition] = React.useState("");
  const [battery, setBattery] = React.useState("");
  const [value, setValue] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !model || !value) return;
    onSubmit({
      deviceBrand: brand,
      deviceModel: model,
      storage: storage || undefined,
      color: color || undefined,
      imei: imei || undefined,
      conditionGrade: condition || undefined,
      batteryHealth: battery || undefined,
      appraisalValue: Number(value),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Merek*" value={brand} onChange={(e) => setBrand(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Model*" value={model} onChange={(e) => setModel(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Storage" value={storage} onChange={(e) => setStorage(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Warna" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="IMEI" value={imei} onChange={(e) => setImei(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Kondisi" value={condition} onChange={(e) => setCondition(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Baterai" value={battery} onChange={(e) => setBattery(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Nilai tukar*" type="number" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-xs" />
      </div>
      <Button type="submit" size="sm" className="w-full text-xs" disabled={!brand || !model || !value}>
        Simpan Tukar Tambah
      </Button>
    </form>
  );
}

/* ─── Payment Summary ─── */

function PaymentSummary({
  cart,
  discountAmount,
  tradeIn,
}: {
  cart: PosCartItem[];
  discountAmount: number;
  tradeIn?: PosTradeIn;
}) {
  const subtotal = cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const tradeInValue = tradeIn?.appraisalValue ?? 0;
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const amountDue = Math.max(0, totalAfterDiscount - tradeInValue);

  return (
    <div className="space-y-1.5 rounded-xl border bg-card p-3 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Diskon</span>
          <span className="text-destructive">-{formatPrice(discountAmount)}</span>
        </div>
      )}
      {tradeInValue > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Nilai Tukar</span>
          <span className="text-destructive">-{formatPrice(tradeInValue)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold text-base pt-1.5 border-t">
        <span>Total Dibayar</span>
        <span>{formatPrice(amountDue)}</span>
      </div>
    </div>
  );
}

function SidebarSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ─── Success Screen ─── */

function SuccessScreen({
  saleNumber,
  grossAmount,
  discountAmount,
  tradeInAmount,
  amountDue,
  paidAmount,
  changeAmount,
  mdrAmount,
  netAmount,
  onNewSale,
}: {
  saleNumber: string;
  grossAmount: number;
  discountAmount: number;
  tradeInAmount: number;
  amountDue: number;
  paidAmount: number;
  changeAmount: number;
  mdrAmount: number;
  netAmount: number;
  onNewSale: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <CheckCircle2 className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Penjualan Berhasil</h3>
      <p className="text-sm text-muted-foreground mb-1">Nomor: {saleNumber}</p>
      <p className="text-2xl font-bold mb-4">{formatPrice(paidAmount)}</p>
      <div className="w-full max-w-xs space-y-1 rounded-lg border bg-muted/30 p-3 text-sm text-left">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(grossAmount)}</span></div>
        <div className="flex justify-between"><span>Diskon</span><span>-{formatPrice(discountAmount)}</span></div>
        <div className="flex justify-between"><span>Tukar tambah</span><span>-{formatPrice(tradeInAmount)}</span></div>
        <div className="flex justify-between font-medium"><span>Total bayar</span><span>{formatPrice(amountDue)}</span></div>
        <div className="flex justify-between"><span>Dibayar</span><span>{formatPrice(paidAmount)}</span></div>
        <div className="flex justify-between"><span>Kembalian</span><span>{formatPrice(changeAmount)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>MDR</span><span>{formatPrice(mdrAmount)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Net</span><span>{formatPrice(netAmount)}</span></div>
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onNewSale}>
          <RepeatIcon className="h-4 w-4 mr-1" />
          Transaksi Baru
        </Button>
      </div>
    </div>
  );
}

/* ─── Main CartPanel ─── */

export interface CartPanelProps {
  cart: PosCartItem[];
  customerId?: string;
  customerQuickCreate?: { name: string; phone?: string };
  tradeIn?: PosTradeIn;
  discountAmount: number;
  submitting: boolean;
  error?: string;
  success?: {
    saleNumber: string;
    grossAmount: number;
    discountAmount: number;
    tradeInAmount: number;
    amountDue: number;
    paidAmount: number;
    changeAmount: number;
    mdrAmount: number;
    netAmount: number;
  };
  paymentMethods: Array<{ id: string; name: string; type: string }>;
  brandSlug: string;
  onRemoveItem: (key: string) => void;
  onUpdateQty: (key: string, qty: number) => void;
  onSetCustomer: (id: string) => void;
  onSetCustomerQuick: (data: { name: string; phone?: string }) => void;
  onSetTradeIn: (t?: PosTradeIn) => void;
  onSetDiscount: (amount: number) => void;
  onSubmitSale: (payment: { paymentMethodId: string; amount: number }) => void;
  onReset: () => void;
}

export function CartPanel({
  cart,
  customerId,
  customerQuickCreate,
  tradeIn,
  discountAmount,
  submitting,
  error,
  success,
  paymentMethods,
  brandSlug,
  onRemoveItem,
  onUpdateQty,
  onSetTradeIn,
  onSetDiscount,
  onSubmitSale,
  onReset,
}: CartPanelProps) {
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [paidAmount, setPaidAmount] = React.useState("");
  const [localError, setLocalError] = React.useState<string | undefined>();
  const ref = React.useRef<HTMLDivElement>(null);

  const subtotal = cart.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const hasDeviceUnit = cart.some((item) => item.itemType === "DEVICE_UNIT");
  const tradeInValue = tradeIn?.appraisalValue ?? 0;
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const amountDue = Math.max(0, totalAfterDiscount - tradeInValue);
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentMethod);
  const selectedPaymentText = `${selectedPaymentMethod?.type ?? ""} ${selectedPaymentMethod?.name ?? ""}`.toUpperCase();
  const isCashPayment = selectedPaymentText.includes("CASH") || selectedPaymentText.includes("TUNAI");
  const cashPaidAmount = Number(paidAmount) || 0;
  const cashChangeAmount = isCashPayment ? Math.max(0, cashPaidAmount - amountDue) : 0;

  React.useEffect(() => {
    if (!hasDeviceUnit && tradeIn) {
      onSetTradeIn(undefined);
    }
  }, [hasDeviceUnit, onSetTradeIn, tradeIn]);

  React.useEffect(() => {
    if (!paymentMethod) return;

    if (!isCashPayment) {
      setPaidAmount(String(amountDue));
      setLocalError(undefined);
      return;
    }

    if (!paidAmount || Number(paidAmount) <= 0) {
      setPaidAmount(String(amountDue));
    }
  }, [amountDue, isCashPayment, paidAmount, paymentMethod]);

  // Success screen
  if (success) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-lg border bg-card lg:rounded-none lg:border-0">
        <SuccessScreen
          saleNumber={success.saleNumber}
          grossAmount={success.grossAmount}
          discountAmount={success.discountAmount}
          tradeInAmount={success.tradeInAmount}
          amountDue={success.amountDue}
          paidAmount={success.paidAmount}
          changeAmount={success.changeAmount}
          mdrAmount={success.mdrAmount}
          netAmount={success.netAmount}
          onNewSale={onReset}
        />
      </div>
    );
  }

  const handlePay = () => {
    if (!paymentMethod) return;
    setLocalError(undefined);

    if (tradeIn && !hasDeviceUnit) {
      setLocalError("Tukar tambah hanya tersedia untuk penjualan unit/device.");
      return;
    }

    if (tradeIn && (!tradeIn.deviceBrand || !tradeIn.deviceModel || !tradeIn.appraisalValue || tradeIn.appraisalValue <= 0)) {
      setLocalError("Data tukar tambah belum lengkap.");
      return;
    }

    const amount = isCashPayment ? Number(paidAmount) || 0 : amountDue;
    if (isCashPayment && amount < amountDue) {
      setLocalError("Jumlah dibayar tunai harus minimal total tagihan.");
      return;
    }

    onSubmitSale({
      paymentMethodId: paymentMethod,
      amount,
    });
  };

  return (
    <div ref={ref} className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border bg-background lg:min-h-0 lg:rounded-none lg:border-0">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 shrink-0 text-muted-foreground" />
              <h2 className="truncate text-base font-semibold">Keranjang</h2>
              <Badge variant="secondary" className="text-xs">{cart.length}</Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              POS checkout satu transaksi atomic
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <ScrollArea className="min-h-0 flex-1 p-5 pb-6">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Keranjang kosong</p>
            <p className="text-xs">Pilih produk untuk memulai transaksi</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <SidebarSection icon={ShoppingCart} title="Item Keranjang">
              <div className="space-y-2">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.cartKey}
                    item={item}
                    onRemove={() => onRemoveItem(item.cartKey)}
                    onUpdateQty={(qty) => onUpdateQty(item.cartKey, qty)}
                  />
                ))}
              </div>
            </SidebarSection>

            {(customerId || customerQuickCreate) && (
              <SidebarSection icon={User} title="Pelanggan">
                <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
                  {customerQuickCreate ? (
                    <>
                      <p className="text-sm font-medium text-foreground">{customerQuickCreate.name}</p>
                      {customerQuickCreate.phone && <p>{customerQuickCreate.phone}</p>}
                    </>
                  ) : (
                    <p>ID pelanggan: {customerId}</p>
                  )}
                </div>
              </SidebarSection>
            )}

            <SidebarSection icon={Receipt} title="Ringkasan">
              <div className="space-y-3">
                {/* Discount */}
                <div className="flex items-center gap-2 rounded-xl border bg-card p-3">
                  <Label className="shrink-0 text-xs">Diskon</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={discountAmount || ""}
                    onChange={(e) => onSetDiscount(Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>

                <TradeInSection tradeIn={tradeIn} allowTradeIn={hasDeviceUnit} onSet={onSetTradeIn} />

                <PaymentSummary
                  cart={cart}
                  discountAmount={discountAmount}
                  tradeIn={tradeIn}
                />
              </div>
            </SidebarSection>

            <SidebarSection icon={Wallet} title="Pembayaran">
              <div className="space-y-3 rounded-xl border bg-card p-3">
                <div className="space-y-2">
                  <Label className="text-xs">Metode Pembayaran</Label>
                  <Select value={paymentMethod} onValueChange={(value) => { setPaymentMethod(value); setLocalError(undefined); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih metode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name} ({m.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {paymentMethods.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Belum ada metode pembayaran aktif untuk brand ini.
                    </p>
                  )}
                </div>

                {isCashPayment ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Jumlah Dibayar</Label>
                    <Input
                      type="number"
                      min={amountDue}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="h-9 text-sm font-semibold"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Kembalian preview</span>
                      <span className="font-medium text-foreground">{formatPrice(cashChangeAmount)}</span>
                    </div>
                  </div>
                ) : paymentMethod ? (
                  <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                    Pembayaran non-tunai otomatis mengikuti total tagihan.
                  </div>
                ) : null}
              </div>
            </SidebarSection>
          </div>
        )}
      </ScrollArea>

      {/* Sticky footer action area */}
      {cart.length > 0 && (
        <div className="shrink-0 space-y-3 border-t bg-background px-5 py-4">
          {/* Error */}
          {(localError || error) && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {localError || error}
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full h-10 text-sm font-semibold"
            disabled={!paymentMethod || submitting || amountDue <= 0 || paymentMethods.length === 0}
            onClick={handlePay}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Memproses...
              </span>
            ) : (
              `Bayar ${formatPrice(amountDue)}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
