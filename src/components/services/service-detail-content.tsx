"use client";

import * as React from "react";
import {
  Smartphone,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  FileText,
  MessageSquare,
  Wallet,
  PiggyBank,
  CheckCircle,
  Coins,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";

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
import { UpdateServiceStatusDialog } from "@/components/services/update-service-status-floating-panel";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import { ReopenServiceDialog } from "@/components/services/reopen-service-dialog";

/* ─── Props ─── */

interface ServiceDetailContentProps {
  service: ServiceRecord | null;
  onClose: () => void;
  brandSlug?: string;
  onServiceUpdated?: () => void;
}

/* ─── Component ─── */

export function ServiceDetailContent({
  service,
  onClose,
  brandSlug: brandSlugProp,
  onServiceUpdated,
}: ServiceDetailContentProps) {
  const params = useParams();
  const brandSlug = brandSlugProp ?? (params?.brandSlug as string) ?? "";

  if (!service) return null;

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
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
  const isCancelled = localStatus === "batal";
  const totalDueVal = Math.max(totalSparepart, 100000);
  const paymentSummary: ServicePaymentSummary = calculateServicePaymentSummary(
    totalDueVal,
    enrichedPayments,
  );
  const paymentStatusLabel = getPaymentStatusLabel(
    paymentSummary.paymentStatus,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Header ── */}
      <div className="border-b px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <service.deviceIcon className="size-4 text-muted-foreground" />
            {service.id}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_CONFIG[localStatus].color}`}
            >
              <span
                className={`size-1.5 rounded-full ${STATUS_CONFIG[localStatus].dot}`}
              />
              {STATUS_CONFIG[localStatus].label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {service.deviceBrand} {service.deviceModel} —{" "}
            {service.customerName}
          </p>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
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

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Total Tagihan
                  </span>
                  <span className="font-medium text-foreground">
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

              {totalSparepart > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Total sparepart: {formatCurrency(totalSparepart)}
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
                  {i < service.timeline.length - 1 && (
                    <div className="absolute bottom-0 left-[5px] top-[14px] w-px bg-border" />
                  )}
                  <div className="mt-1 flex size-2.5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background" />
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
                    Total Sparepart
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
                    brandSlug={brandSlug}
                    onStatusUpdated={(status) => {
                      setLocalStatus(status);
                      onServiceUpdated?.();
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCancelOpen(true)}
                  >
                    <XCircle className="size-3.5" />
                    Batalkan
                  </Button>
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
            {isCancelled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setReopenOpen(true)}
              >
                <RotateCcw className="size-3.5" />
                Buka Ulang
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={onClose}
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* ── Payment Panel ── */}
      <ServicePaymentPanel
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        service={service}
        brandSlug={brandSlug}
        onPaymentRecorded={() => {
          onServiceUpdated?.();
        }}
      />

      {/* ── Cancel Dialog ── */}
      <CancelServiceDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        service={service}
        brandSlug={brandSlug}
        onConfirm={() => {
          setCancelOpen(false);
          onServiceUpdated?.();
        }}
      />

      {/* ── Reopen Dialog ── */}
      <ReopenServiceDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        service={service}
        brandSlug={brandSlug}
        onConfirm={() => {
          setReopenOpen(false);
          onServiceUpdated?.();
        }}
      />
    </div>
  );
}
