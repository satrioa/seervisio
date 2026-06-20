"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Smartphone,
  User,
  Wrench,
  X,
  Wallet,
  CheckCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import {
  type ServiceRecord,
  type ServicePaymentRecord,
  type SparepartItem,
  STATUS_CONFIG,
  STATUS_ORDER,
  formatCurrency,
  getTotalSparepartCost,
  getTotalPayment,
  getPaymentStatusLabel,
} from "@/components/services/service-data";
import { ServicePaymentPanel } from "@/components/services/service-payment-panel";
import { ServiceDeviceIcon } from "@/components/services/service-device-icon";
import { UpdateServiceStatusDialog } from "@/components/services/update-service-status-floating-panel";
import { ServiceSparepartSection } from "@/components/services/service-sparepart-section";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import { ReopenServiceDialog } from "@/components/services/reopen-service-dialog";
import {
  getPickupStatus,
  getPickupLabel,
  getPickupColor,
  type PickupStatus,
} from "@/components/services/service-data";
import { verifyServicePickupAction, getServicePaymentPanelDataAction } from "@/server/actions/service-workflow.actions";
import { getSessionRoleAction } from "@/server/actions/service.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import {
  buildServicePaymentSummary,
  type PaymentSummaryRow,
  type ServicePaymentSummaryResult,
} from "@/lib/services/payment-summary";

interface ServiceSidebarDetailProps {
  service: ServiceRecord;
  brandSlug?: string;
  onServiceUpdated?: () => void;
  role?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ServiceSidebarDetail({ service, brandSlug: brandSlugProp, onServiceUpdated, role }: ServiceSidebarDetailProps) {
  const params = useParams();
  const brandSlug = brandSlugProp ?? (params?.brandSlug as string) ?? "";
  const { showOverview } = useRightSidebar();
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [pickupDialogOpen, setPickupDialogOpen] = React.useState(false);
  const [resolvedRole, setResolvedRole] = React.useState<string | undefined>(role);
  const [enrichedPayments, setEnrichedPayments] = React.useState<
    ServicePaymentRecord[]
  >(() => (service as any).__paymentRecords ?? []);

  const [enrichedSpareparts, setEnrichedSpareparts] = React.useState<SparepartItem[]>(
    () => (service as any).__spareparts ?? service.spareparts ?? []
  );

  const [paymentData, setPaymentData] = React.useState<ServicePaymentSummaryResult | null>(null);
  const [paymentDataLoading, setPaymentDataLoading] = React.useState(false);

  React.useEffect(() => {
    if (role || !brandSlug) {
      setResolvedRole(role);
      return;
    }
    getSessionRoleAction(brandSlug).then((result) => {
      if (result.success) setResolvedRole(result.data.role);
    });
  }, [role, brandSlug]);

  React.useEffect(() => {
    setEnrichedPayments((service as any).__paymentRecords ?? []);
    setEnrichedSpareparts((service as any).__spareparts ?? service.spareparts ?? []);
  }, [service]);

  React.useEffect(() => {
    if (!service?.id || !brandSlug) return;
    setPaymentDataLoading(true);
    getServicePaymentPanelDataAction(brandSlug, service.id).then((result) => {
      if (result.success) {
        setPaymentData({
          totalBill: Number(result.data.totalBill),
          totalPaid: Number(result.data.totalPaid),
          remainingAmount: Number(result.data.remainingAmount),
          paymentState: result.data.paymentState as ServicePaymentSummaryResult["paymentState"],
          successfulPayments: result.data.payments as PaymentSummaryRow[],
        });
      } else {
        setPaymentData(null);
      }
      setPaymentDataLoading(false);
    });
  }, [service, brandSlug]);

  const statusIndex = STATUS_ORDER.indexOf(service.status);
  const totalSparepart = getTotalSparepartCost(service.spareparts);
  const totalCost = Number(service.finalCost || service.estimatedCost || 0);

  const summary = paymentData ?? (() => {
    const totalPaidFromRecords = enrichedPayments.length > 0
      ? enrichedPayments.reduce((sum, payment) => sum + payment.amount, 0)
      : getTotalPayment(service.payments);
    const rem = Math.max(0, totalCost - totalPaidFromRecords);
    let ps: ServicePaymentSummaryResult["paymentState"] = "UNPAID";
    if (totalPaidFromRecords <= 0) ps = "UNPAID";
    else if (rem > 0) ps = "PARTIAL";
    else ps = "PAID";
    return { totalBill: totalCost, totalPaid: totalPaidFromRecords, remainingAmount: rem, paymentState: ps, successfulPayments: [] };
  })();

  const isPaid = summary.paymentState === "PAID";
  const isCancelled = service.status === "cancelled";
  const paymentStatusLabel = getPaymentStatusLabel(summary.paymentState);

  console.log("[service-sidebar/payment-summary]", {
    serviceId: service?.id,
    serviceNumber: service?.serviceNumber,
    paymentsCount: summary.successfulPayments.length,
    payments: summary.successfulPayments.map(p => ({
      paymentNumber: p.paymentNumber,
      status: p.paymentStatus,
      grossAmount: p.grossAmount,
    })),
    totalBill: summary.totalBill,
    totalPaid: summary.totalPaid,
    remainingAmount: summary.remainingAmount,
    paymentState: summary.paymentState,
  });

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-background px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ServiceDeviceIcon iconKey={service.deviceIconKey} className="size-4 shrink-0 text-muted-foreground" />
              <h2 className="truncate text-base font-semibold">{service.serviceNumber || service.id}</h2>
              <Badge className={STATUS_CONFIG[service.status].color}>
                <span className={`mr-1.5 size-1.5 rounded-full ${STATUS_CONFIG[service.status].dot}`} />
                {STATUS_CONFIG[service.status].label}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {service.deviceName} · {service.customerName}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={showOverview}
            aria-label="Tutup detail servis"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <motion.div
          className="flex flex-1 flex-col gap-5 p-5 pb-24"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <InfoCard icon={User} label="Pelanggan">
            <p className="text-sm font-medium">{service.customerName || "Tanpa nama"}</p>
            {service.customerPhone ? <p>{service.customerPhone}</p> : <p>No. HP belum ada</p>}
            {service.customerAddress && <p>{service.customerAddress}</p>}
          </InfoCard>

          <InfoCard icon={Smartphone} label="Perangkat">
            <p className="text-sm font-medium">
              {service.deviceName}
            </p>
            {service.deviceType && <p>{service.deviceType}</p>}
            {service.serialNumber && <p>SN: {service.serialNumber}</p>}
          </InfoCard>

          <InfoCard icon={Clock} label="Layanan">
            <p>Masuk: {formatDateTime(service.intakeAt || service.createdAt)}</p>
            <p>Update: {formatDateTime(service.updatedAt)}</p>
            {service.technicianName && <p>Teknisi: {service.technicianName}</p>}
            <p>Cabang: {service.branchName ?? "Cabang tidak diketahui"}</p>
          </InfoCard>

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
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Sudah Dibayar
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Sisa Tagihan
                </span>
                <span className="font-bold text-foreground">
                  {formatCurrency(summary.remainingAmount)}
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
            {summary.successfulPayments.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Riwayat Pembayaran
                  </span>
                  {summary.successfulPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="size-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-foreground">
                            {p.paymentNumber}
                          </span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">
                          {[p.methodType, p.accountName].filter(Boolean).join(" · ") || p.paymentStatus}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium tabular-nums text-foreground">
                        {formatCurrency(p.grossAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {summary.successfulPayments.length === 0 && (
              <span className="text-[10px] text-muted-foreground">
                Belum ada pembayaran
              </span>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}><Section icon={FileText} title="Issue & Diagnosis">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Keluhan</p>
            <p className="mt-1 text-xs text-foreground">{service.issue}</p>
            {service.diagnosis && (
              <>
                <Separator className="my-3" />
                <p className="text-[11px] font-medium text-muted-foreground">Diagnosis</p>
                <p className="mt-1 text-xs text-foreground">{service.diagnosis}</p>
              </>
            )}
          </div>
        </Section></motion.div>

        <motion.div variants={itemVariants}><Section icon={CheckCircle2} title="Status Progress">
          <div className="flex items-start gap-0">
            {STATUS_ORDER.map((status, index) => {
              const isActive = index <= statusIndex;
              const isCurrent = index === statusIndex;
              const isLast = index === STATUS_ORDER.length - 1;

              return (
                <React.Fragment key={status}>
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
                        <span className="text-[10px] font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span className="max-w-12 truncate text-[9px] font-medium text-muted-foreground">
                      {STATUS_CONFIG[status].label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`mt-3 h-px flex-1 ${
                        index < statusIndex ? "bg-primary/40" : "bg-border"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Section></motion.div>

        <motion.div variants={itemVariants}><Section icon={Clock} title="Aktivitas">
          <div className="flex flex-col">
            {service.timeline.length > 0 ? service.timeline.map((entry, index) => (
              <div key={`${entry.timestamp}-${index}`} className="relative flex gap-3 pb-4 pl-4 last:pb-0">
                {index < service.timeline.length - 1 && (
                  <div className="absolute bottom-0 left-[5px] top-[14px] w-px bg-border" />
                )}
                <div className="mt-1 size-2.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{entry.status}</p>
                  {entry.note && (
                    <p className="text-xs text-muted-foreground">{entry.note}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {entry.timestamp} Â· {entry.by}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground">Belum ada aktivitas</p>
            )}
          </div>
        </Section></motion.div>

        <motion.div variants={itemVariants}>
          <ServiceSparepartSection
            serviceId={service.id}
            serviceNumber={service.serviceNumber || service.id}
            branchId={service.branchId}
            spareparts={enrichedSpareparts}
            currentStatus={service.status}
            onSparepartAdded={onServiceUpdated}
            onSparepartRemoved={onServiceUpdated}
            brandSlug={brandSlug}
          />
        </motion.div>

        <motion.div variants={itemVariants}><Section icon={MessageSquare} title="Catatan">
          {service.notes.length > 0 ? (
            <div className="space-y-2">
              {service.notes.map((note, index) => (
                <div key={`${note.timestamp}-${index}`} className="rounded-xl bg-muted/50 px-3 py-2">
                  <p className="text-xs text-foreground">{note.text}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {note.timestamp} Â· {note.by}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tidak ada catatan</p>
          )}
        </Section></motion.div>
      </motion.div>

      {service.status === "selesai" && (
        (() => {
          const pickupStatus = getPickupStatus(service);
          if (pickupStatus === "PICKED_UP") {
            return (
              <div className="mx-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-2">Sudah Diambil</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  {service.pickupName && <p>Nama: {service.pickupName}</p>}
                  {service.pickupPhone && <p>No. HP: {service.pickupPhone}</p>}
                  {service.pickupRelation && <p>Relasi: {service.pickupRelation}</p>}
                  {service.pickupNote && <p>Catatan: {service.pickupNote}</p>}
                  {service.pickedUpAt && <p>Waktu: {new Date(service.pickedUpAt).toLocaleString("id-ID")}</p>}
                </div>
              </div>
            );
          }
          return (
            <div className="mx-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <h4 className="font-medium text-green-900 mb-1">Unit Siap Diambil</h4>
              <p className="text-sm text-green-700 mb-3">
                Status servis sudah selesai. Unit siap diserahkan ke pelanggan.
              </p>
              <button
                onClick={() => setPickupDialogOpen(true)}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Verifikasi Pengambilan
              </button>
            </div>
          );
        })()
      )}

      <div className="sticky bottom-0 border-t bg-background/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-col gap-2">
          {!isCancelled && (
            <div className="grid grid-cols-2 gap-2">
              <UpdateServiceStatusDialog
                service={service}
                brandSlug={brandSlug}
                onStatusUpdated={onServiceUpdated}
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
          {!isCancelled && resolvedRole !== "TECHNICIAN" && (
            <Button
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => setPaymentOpen(true)}
            >
              <Wallet className="size-3.5" />
              {isPaid ? "Detail Pembayaran" : "Terima Pembayaran"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={showOverview}
          >
            Tutup
          </Button>
        </div>
      </div>

      {/* Payment Panel */}
      <ServicePaymentPanel
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        service={service}
        brandSlug={brandSlug}
        onPaymentRecorded={() => {
          onServiceUpdated?.();
        }}
      />

      {/* Cancel Dialog */}
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

      {/* Reopen Dialog */}
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

      {/* Pickup Verification Dialog */}
      <PickupVerificationDialog
        open={pickupDialogOpen}
        onOpenChange={setPickupDialogOpen}
        service={service}
        brandSlug={brandSlug}
        onSuccess={() => {
          setPickupDialogOpen(false);
          onServiceUpdated?.();
        }}
      />
    </div>
  );
}

function PickupVerificationDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug: string;
  onSuccess: () => void;
}) {
  const [pickupName, setPickupName] = React.useState("");
  const [pickupPhone, setPickupPhone] = React.useState("");
  const [pickupRelation, setPickupRelation] = React.useState("");
  const [pickupNote, setPickupNote] = React.useState("");
  const [unitChecked, setUnitChecked] = React.useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = React.useState(false);
  const [customerAcceptedCondition, setCustomerAcceptedCondition] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!pickupName || !pickupRelation || !unitChecked || !paymentConfirmed || !customerAcceptedCondition) return;
    setIsSubmitting(true);
    triggerDynamicIslandFeedback({ type: "loading", title: "Memverifikasi pengambilan...", description: "Mencatat serah terima unit..." });

    try {
      const result = await verifyServicePickupAction({
        brandSlug,
        serviceId: service.id,
        pickupName,
        pickupPhone: pickupPhone || undefined,
        pickupRelation,
        pickupNote: pickupNote || undefined,
        checklist: { unitChecked, paymentConfirmed, customerAcceptedCondition },
      });

      if (result.success) {
        triggerDynamicIslandFeedback({ type: "success", title: "Unit sudah diambil", description: "Serah terima unit berhasil dicatat." });
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({ type: "error", title: "Gagal verifikasi pengambilan", description: result.error });
      }
    } catch (err: any) {
      triggerDynamicIslandFeedback({ type: "error", title: "Gagal verifikasi pengambilan", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Verifikasi Pengambilan Unit</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Nama Pengambil *</label>
            <input
              type="text"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={pickupName}
              onChange={(e) => setPickupName(e.target.value)}
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Nomor HP</label>
            <input
              type="text"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={pickupPhone}
              onChange={(e) => setPickupPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Relasi *</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={pickupRelation}
              onChange={(e) => setPickupRelation(e.target.value)}
            >
              <option value="">Pilih relasi</option>
              <option value="Customer sendiri">Customer sendiri</option>
              <option value="Keluarga">Keluarga</option>
              <option value="Kurir">Kurir</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Catatan</label>
            <textarea
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={pickupNote}
              onChange={(e) => setPickupNote(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan..."
            />
          </div>

          <div className="space-y-2 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={unitChecked} onChange={(e) => setUnitChecked(e.target.checked)} />
              Unit sudah dicek bersama customer
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} />
              Pembayaran sudah lunas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={customerAcceptedCondition} onChange={(e) => setCustomerAcceptedCondition(e.target.checked)} />
              Customer menyetujui kondisi unit
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !pickupName || !pickupRelation || !unitChecked || !paymentConfirmed || !customerAcceptedCondition}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? "Memproses..." : "Konfirmasi Pengambilan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
        <Icon className="size-3" />
        {label}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Section({
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
