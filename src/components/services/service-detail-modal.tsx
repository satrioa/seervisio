"use client";

import * as React from "react";
import {
  Smartphone,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  CreditCard,
  FileText,
  MessageSquare,
  X,
  Circle,
  Wallet,
  PiggyBank,
  CheckCircle,
  Coins,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type ServiceRecord,
  type ServiceStatus,
  type ServicePaymentRecord,
  type ServicePaymentSummary,
  STATUS_CONFIG,
  STATUS_ORDER,
  formatCurrency,
  getTotalSparepartCost,
  getTotalPayment,
  calculateServicePaymentSummary,
  getPaymentStatusLabel,
  getPaymentRecordTypeLabel,
} from "@/components/services/service-data";
import { ServicePaymentPanel } from "@/components/services/service-payment-panel";
import { ServiceDeviceIcon } from "@/components/services/service-device-icon";
import { UpdateServiceStatusDialog } from "@/components/services/update-service-status-floating-panel";

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

interface ServiceDetailModalProps {
  service: ServiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug?: string;
}

export function ServiceDetailModal({
  service,
  open,
  onOpenChange,
  brandSlug,
}: ServiceDetailModalProps) {
  if (!service) return null;

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [debugUpdateOpen, setDebugUpdateOpen] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState<ServiceStatus>(
    service.status,
  );
  const [enrichedPayments, setEnrichedPayments] = React.useState<
    ServicePaymentRecord[]
  >(() => (service as any).__paymentRecords ?? []);

  React.useEffect(() => {
    setLocalStatus(service.status);
    setEnrichedPayments((service as any).__paymentRecords ?? []);
  }, [service]);

  const displayService = React.useMemo(
    () => ({ ...service, status: localStatus }),
    [localStatus, service],
  );

  const statusIndex = STATUS_ORDER.indexOf(localStatus);
  const totalSparepart = getTotalSparepartCost(service.spareparts);
  const totalPaid = getTotalPayment(service.payments);
  const isPaid =
    service.payments.length > 0 &&
    service.payments.every((p) => p.status === "lunas");
  const isCancelled = localStatus === "cancelled";
  const totalDueVal = Number(service.finalCost || service.estimatedCost || 0);
  const paymentSummary: ServicePaymentSummary = calculateServicePaymentSummary(
    totalDueVal,
    enrichedPayments,
  );
  const paymentStatusLabel = getPaymentStatusLabel(
    paymentSummary.paymentStatus,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl p-0 flex flex-col">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <ServiceDeviceIcon iconKey={service.deviceIconKey} className="size-4 text-muted-foreground" />
                {service.id}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {service.deviceBrand} {service.deviceModel} —{" "}
                {service.customerName}
              </DialogDescription>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[localStatus].color}`}
            >
              <span
                className={`size-1.5 rounded-full ${STATUS_CONFIG[localStatus].dot}`}
              />
              {STATUS_CONFIG[localStatus].label}
            </span>
          </div>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 p-6 pt-4">
            {/* ── Info Grid ── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Customer Info */}
              <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="size-3" />
                  Pelanggan
                </h4>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {service.customerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {service.customerPhone}
                  </span>
                  {service.customerAddress && (
                    <span className="text-[10px] text-muted-foreground">
                      {service.customerAddress}
                    </span>
                  )}
                </div>
              </div>

              {/* Device Info */}
              <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Smartphone className="size-3" />
                  Perangkat
                </h4>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {service.deviceBrand} {service.deviceModel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {service.deviceType}
                  </span>
                  {service.serialNumber && (
                    <span className="text-[10px] text-muted-foreground">
                      SN: {service.serialNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Service Info */}
              <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="size-3" />
                  Layanan
                </h4>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Masuk: {service.createdAt}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Update: {service.updatedAt}
                  </span>
                  {service.technician && (
                    <span className="text-xs text-foreground">
                      Teknisi: {service.technician}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Cabang: {service.branch}
                  </span>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Wallet className="size-3" />
                  Pembayaran
                </h4>

                {/* Payment Summary Card */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Estimasi Biaya
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(service.estimatedCost || 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5 text-xs">
                    <span className="font-medium text-foreground">
                      Total Tagihan
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(totalDueVal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Sudah Dibayar
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(paymentSummary.totalPaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      Sisa Tagihan
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(paymentSummary.remainingBalance)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${paymentStatusLabel.color}`}
                    >
                      {paymentStatusLabel.label}
                    </Badge>
                  </div>
                </div>

                {/* Payment History */}
                {enrichedPayments.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        Riwayat Pembayaran
                      </span>
                      {enrichedPayments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              {p.paymentType === "DOWN_PAYMENT" && (
                                <PiggyBank className="size-3 text-amber-500" />
                              )}
                              {p.paymentType === "FINAL_PAYMENT" && (
                                <CheckCircle className="size-3 text-emerald-500" />
                              )}
                              {p.paymentType === "PARTIAL_PAYMENT" && (
                                <Coins className="size-3 text-blue-500" />
                              )}
                              <span className="text-[10px] font-medium text-foreground">
                                {getPaymentRecordTypeLabel(p.paymentType)}
                              </span>
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {p.method} · {p.accountName}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium tabular-nums text-foreground">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {enrichedPayments.length === 0 &&
                  service.payments.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      Belum ada pembayaran
                    </span>
                  )}


              </div>
            </div>

            <Separator />

            {/* ── Issue & Diagnosis ── */}
            <div className="flex flex-col gap-3">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="size-3" />
                Issue & Diagnosis
              </h4>
              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Keluhan
                  </span>
                  <p className="text-xs text-foreground">{service.issue}</p>
                </div>
                {service.diagnosis && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Diagnosis
                      </span>
                      <p className="text-xs text-foreground">
                        {service.diagnosis}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Status Stepper ── */}
            <div className="flex flex-col gap-3">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="size-3" />
                Status Progress
              </h4>
              <div className="flex items-start gap-0">
                {STATUS_ORDER.map((s, i) => {
                  const isActive = i <= statusIndex;
                  const isCurrent = i === statusIndex;
                  const isLast = i === STATUS_ORDER.length - 1;
                  return (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`flex size-6 items-center justify-center rounded-full ${
                            isCurrent
                              ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                              : isActive
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isActive && !isCurrent ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <span className="text-[10px] font-bold">
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-medium ${
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {STATUS_CONFIG[s].label}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={`mt-3 h-px flex-1 ${
                            i < statusIndex ? "bg-primary/40" : "bg-border"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* ── Timeline ── */}
            <div className="flex flex-col gap-3">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3" />
                Aktivitas
              </h4>
              <div className="flex flex-col gap-0">
                {service.timeline.map((entry, i) => (
                  <div
                    key={i}
                    className="relative flex gap-3 pb-4 pl-4 last:pb-0"
                  >
                    {/* Timeline line */}
                    {i < service.timeline.length - 1 && (
                      <div className="absolute bottom-0 left-[5px] top-[14px] w-px bg-border" />
                    )}
                    {/* Dot */}
                    <div className="mt-1 flex size-2.5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background" />
                    {/* Content */}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {entry.status}
                      </span>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground">
                          {entry.note}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {entry.timestamp} — {entry.by}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Spareparts ── */}
            <div className="flex flex-col gap-3">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Wrench className="size-3" />
                Sparepart Digunakan
              </h4>
              {service.spareparts.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {service.spareparts.map((sp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground">
                          {sp.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {sp.qty}x @ {formatCurrency(sp.price)}
                        </span>
                      </div>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {formatCurrency(sp.price * sp.qty)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      Nilai sparepart (internal)
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {formatCurrency(totalSparepart)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Belum ada sparepart digunakan
                </p>
              )}
            </div>

            <Separator />

            {/* ── Notes ── */}
            <div className="flex flex-col gap-3">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="size-3" />
                Catatan
              </h4>
              {service.notes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {service.notes.map((n, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <p className="text-xs text-foreground">{n.text}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {n.timestamp} — {n.by}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tidak ada catatan
                </p>
              )}
            </div>
          </div>

          {/* ── Footer / Actions ── */}
          <div className="border-t bg-background px-6 py-3">
            <div className="flex flex-col gap-2">
              {!isCancelled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
<UpdateServiceStatusDialog
  service={displayService}
  onStatusUpdated={setLocalStatus}
/>
                    <Button variant="outline" size="sm" className="text-xs">
                      Tambah Sparepart
                    </Button>
                  </div>
                  {/* DEBUG: Hardcoded Update Status test */}
                  <div className="mt-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      onClick={() => {
                        console.log("[HARDCODED UPDATE STATUS] clicked");
                        console.log("[HARDCODED] displayService.status:", displayService.status);
                        console.log("[HARDCODED] localStatus:", localStatus);
                        setDebugUpdateOpen((prev) => !prev);
                      }}
                    >
                      {debugUpdateOpen ? "▼ Hardcoded Update Status (open)" : "▶ Hardcoded Update Status"}
                    </Button>

                    {debugUpdateOpen ? (
                      <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
                        <p className="font-semibold text-foreground">Hardcoded Update Status Panel</p>
                        <p className="mt-1 text-muted-foreground">
                          If this appears, button click and parent state work.
                        </p>
                        <div className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                          <p>displayService.status: {String(displayService.status)}</p>
                          <p>localStatus: {String(localStatus)}</p>
                          <p>isPaid: {String(isPaid)}</p>
                          <p>isCancelled: {String(isCancelled)}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {!isPaid && paymentSummary.remainingBalance > 0 && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <Wallet className="size-3.5" />
                      Terima Pembayaran
                    </Button>
                  )}
                </>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Tutup
                </Button>
              </DialogClose>
            </div>
          </div>
        </div>

        {/* Payment Panel */}
        <ServicePaymentPanel
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          service={service}
          brandSlug={brandSlug ?? ""}
          onPaymentRecorded={() => {
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
