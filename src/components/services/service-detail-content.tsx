"use client";

import * as React from "react";
import {
  Wrench,
  FileText,
  MessageSquare,
  Wallet,
  XCircle,
  RotateCcw,
  Check,
  Plus,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  type ServiceRecord,
  type ServiceStatus,
  type ServicePaymentRecord,
  STATUS_CONFIG,
  STATUS_ORDER,
  formatCurrency,
  getTotalSparepartCost,
  getTotalPayment,
  getPaymentStatusLabel,
} from "@/components/services/service-data";
import {
  getPickupStatus,
  type PickupStatus,
} from "@/components/services/service-data";
import { ServicePaymentPanel } from "@/components/services/service-payment-panel";
import { ServiceSparepartPanel } from "@/components/services/service-sparepart-panel";
import { UpdateServiceStatusDialog } from "@/components/services/update-service-status-floating-panel";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import { ReopenServiceDialog } from "@/components/services/reopen-service-dialog";
import { ServiceDetailHeader } from "@/components/services/service-detail-header";
import { ServiceTimeline } from "@/components/services/service-detail-timeline";
import { verifyServicePickupAction, getServicePaymentPanelDataAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import {
  type PaymentSummaryRow,
  type ServicePaymentSummaryResult,
} from "@/lib/services/payment-summary";

/* ─── Props ─── */

interface ServiceDetailContentProps {
  service: ServiceRecord | null;
  onClose: () => void;
  brandSlug?: string;
  onServiceUpdated?: () => void;
  role?: string;
  hideStatusSteps?: boolean;
}

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

/* ─── Component ─── */

export function ServiceDetailContent({
  service,
  onClose,
  brandSlug: brandSlugProp,
  onServiceUpdated,
  role,
  hideStatusSteps = false,
}: ServiceDetailContentProps) {
  const params = useParams();
  const brandSlug = brandSlugProp ?? (params?.brandSlug as string) ?? "";

  if (!service) return null;

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [sparepartOpen, setSparepartOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState<ServiceStatus>(service.status);
  const [enrichedPayments, setEnrichedPayments] = React.useState<ServicePaymentRecord[]>(() => (service as any).__paymentRecords ?? []);
  const [pickupDialogOpen, setPickupDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalStatus(service.status);
    setEnrichedPayments((service as any).__paymentRecords ?? []);
  }, [service]);

  const [paymentData, setPaymentData] = React.useState<ServicePaymentSummaryResult | null>(null);

  React.useEffect(() => {
    if (!service?.id || !brandSlug) return;
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
    });
  }, [service, brandSlug]);

  const displayService = React.useMemo(
    () => ({ ...service, status: localStatus }),
    [localStatus, service],
  );

  const statusIndex = STATUS_ORDER.indexOf(localStatus);
  const totalSparepart = getTotalSparepartCost(service.spareparts);
  const totalCost = Number(service.finalCost || service.estimatedCost || 0);

  const summary = React.useMemo(() => {
    if (paymentData) return paymentData;
    if (service.paymentSummary) {
      return {
        totalBill: service.paymentSummary.totalCharged,
        totalPaid: service.paymentSummary.totalPaid,
        remainingAmount: service.paymentSummary.remainingBalance,
        paymentState: service.paymentSummary.paymentStatus as ServicePaymentSummaryResult["paymentState"],
        successfulPayments: [] as PaymentSummaryRow[],
      };
    }
    const totalPaidFromRecords = enrichedPayments.length > 0
      ? enrichedPayments.reduce((sum, payment) => sum + payment.amount, 0)
      : getTotalPayment(service.payments);
    const rem = Math.max(0, totalCost - totalPaidFromRecords);
    let ps: ServicePaymentSummaryResult["paymentState"] = "UNPAID";
    if (totalPaidFromRecords <= 0) ps = "UNPAID";
    else if (rem > 0) ps = "PARTIAL";
    else ps = "PAID";
    return { totalBill: totalCost, totalPaid: totalPaidFromRecords, remainingAmount: rem, paymentState: ps, successfulPayments: [] };
  }, [paymentData, service.paymentSummary, enrichedPayments, service.payments, totalCost]);

  const isPaid = summary.paymentState === "PAID";
  const isCancelled = localStatus === "cancelled";
  const paymentStatusLabel = getPaymentStatusLabel(summary.paymentState);
  const progressPercent = Math.round(((statusIndex + 1) / STATUS_ORDER.length) * 100);

  return (
    <div className="flex h-full flex-col">
      <ServiceDetailHeader
        service={service}
        localStatus={localStatus}
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ═══ Pickup Banner (outside tabs) ═══ */}
        {service.status === "selesai" && (
          <div className="p-6 pb-0">
            <PickupBanner
              service={service}
              pickupStatus={getPickupStatus(service)}
              onVerify={() => setPickupDialogOpen(true)}
            />
          </div>
        )}

        {/* ═══ Tabs ═══ */}
        <Tabs defaultValue="general" className={service.status === "selesai" ? "mt-5" : "mt-0"}>
          <div className="sticky top-0 z-10 bg-background px-6">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 text-xs">Timeline</TabsTrigger>
              <TabsTrigger value="payment" className="flex-1 text-xs">Payment</TabsTrigger>
              <TabsTrigger value="sparepart" className="flex-1 text-xs">Sparepart</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            {/* ═══ General Tab ═══ */}
            <TabsContent value="general" className="mt-0 space-y-5">
              {/* Status Card */}
              <section>
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <SummaryRow label="Device" value={service.deviceName} />
                    <SummaryRow label="Technician" value={service.technicianName || "—"} />
                    <SummaryRow label="Estimated Cost" value={formatCurrency(Number(service.estimatedCost || 0))} />
                    <SummaryRow label="Created" value={formatDateTime(service.intakeAt || service.createdAt)} />
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">Progress</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{Math.min(progressPercent, 100)}%</span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {!hideStatusSteps && (
                    <div className="flex items-center gap-1.5">
                      {STATUS_ORDER.map((s, i) => {
                        const isActive = i <= statusIndex;
                        const isCurrent = i === statusIndex;
                        const isLast = i === STATUS_ORDER.length - 1;
                        return (
                          <React.Fragment key={s}>
                            <div className="flex items-center gap-1">
                              <div
                                className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                                  isCurrent
                                    ? "bg-primary text-primary-foreground"
                                    : isActive
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground/50"
                                }`}
                              >
                                <span className="text-[7px] font-bold">{i + 1}</span>
                              </div>
                              <span
                                className={`hidden truncate text-[9px] font-medium sm:inline ${
                                  isActive ? "text-foreground" : "text-muted-foreground/50"
                                }`}
                              >
                                {STATUS_CONFIG[s].label}
                              </span>
                            </div>
                            {!isLast && <div className={`h-px flex-1 ${i < statusIndex ? "bg-primary/40" : "bg-border"}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Customer Info */}
              <section>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                    <SummaryRow label="Name" value={service.customerName} />
                    <SummaryRow label="Phone" value={service.customerPhone || "—"} />
                    {service.customerAddress && (
                      <div className="col-span-2">
                        <SummaryRow label="Address" value={service.customerAddress} />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Issue & Diagnosis */}
              <section>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue & Diagnosis</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground">Complaint</span>
                      <p className="mt-0.5 text-sm text-foreground">{service.issue}</p>
                    </div>
                    {service.diagnosis && (
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground">Diagnosis</span>
                        <p className="mt-0.5 text-sm text-foreground">{service.diagnosis}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section>
                <SectionHeader icon={MessageSquare} label="Notes" />
                <div className="mt-3">
                  {service.notes.length > 0 ? (
                    <div className="space-y-2">
                      {service.notes.map((n, i) => (
                        <div key={i} className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-xs">{n.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{n.timestamp} — {n.by}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={MessageSquare} text="No notes" />
                  )}
                </div>
              </section>
            </TabsContent>

            {/* ═══ Timeline Tab ═══ */}
            <TabsContent value="timeline" className="mt-0">
              <ServiceTimeline entries={service.timeline} />
            </TabsContent>

            {/* ═══ Payment Tab ═══ */}
            <TabsContent value="payment" className="mt-0 space-y-5">
              <section>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</span>
                    <Badge variant="outline" className={`ml-auto text-[10px] ${paymentStatusLabel.color}`}>
                      {paymentStatusLabel.label}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Total Bill</span>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(summary.totalBill)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Paid</span>
                      <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(summary.totalPaid)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Remaining</span>
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(summary.remainingAmount)}</p>
                    </div>
                  </div>

                  {summary.successfulPayments.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t pt-3">
                      {summary.successfulPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium">{p.paymentNumber}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {[p.methodType, p.accountName].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium tabular-nums">{formatCurrency(p.grossAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {role !== "TECHNICIAN" && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setPaymentOpen(true)}
                      >
                        <Wallet className="size-3.5 mr-1.5" />
                        {isPaid ? "Payment Detail" : "Receive Payment"}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </TabsContent>

            {/* ═══ Sparepart Tab ═══ */}
            <TabsContent value="sparepart" className="mt-0 space-y-5">
              <section>
                <SectionHeader icon={Wrench} label="Spareparts Used" />
                <div className="mt-3">
                  {service.spareparts.length > 0 ? (
                    <div className="space-y-1.5">
                      {service.spareparts.map((sp, i) => (
                        <div key={sp.id ?? i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{sp.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {sp.qty}x @ {formatCurrency(sp.price)}
                              {sp.imeiSnapshot && <span className="ml-1">· IMEI: {sp.imeiSnapshot}</span>}
                              {sp.isReturned && <span className="ml-1 text-amber-500">· Returned</span>}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium tabular-nums ml-2">{formatCurrency(sp.price * sp.qty)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-1">
                        <span className="text-xs font-semibold">Total (internal)</span>
                        <span className="text-xs font-semibold tabular-nums">{formatCurrency(totalSparepart)}</span>
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={Wrench} text="No spareparts used" />
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setSparepartOpen(true)}
                  >
                    <Plus className="size-3.5 mr-1.5" />
                    Manage Spareparts
                  </Button>
                </div>
              </section>
            </TabsContent>
          </div>
        </Tabs>

        <div className="h-2" />
      </div>

      {/* ── Sticky Footer ── */}
      <div className="shrink-0 border-t bg-background px-6 py-3">
        <div className="flex flex-col gap-2">
          {!isCancelled ? (
            <>
              <div className="flex items-center gap-2">
                <UpdateServiceStatusDialog
                  service={displayService}
                  brandSlug={brandSlug}
                  onStatusUpdated={(status) => {
                    setLocalStatus(status);
                    onServiceUpdated?.();
                  }}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="size-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 text-xs"
                onClick={() => setReopenOpen(true)}
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                Reopen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <ServicePaymentPanel
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        service={service}
        brandSlug={brandSlug}
        onPaymentRecorded={() => { onServiceUpdated?.(); }}
      />

      <ServiceSparepartPanel
        open={sparepartOpen}
        onOpenChange={setSparepartOpen}
        service={service}
        brandSlug={brandSlug}
        onSparepartAdded={() => { onServiceUpdated?.(); }}
      />

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

/* ─── Sub-components ─── */

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-3">
      <Icon className="size-3.5 text-muted-foreground/40" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

/* ─── Pickup Banner (compact) ─── */

function PickupBanner({
  service,
  pickupStatus,
  onVerify,
}: {
  service: ServiceRecord;
  pickupStatus: PickupStatus;
  onVerify: () => void;
}) {
  if (pickupStatus === "PICKED_UP") {
    return (
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-blue-100">
            <Check className="size-3 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Picked up</p>
            <p className="text-[10px] text-muted-foreground">
              {service.pickupName} {service.pickupRelation ? `(${service.pickupRelation})` : ""}
              {service.pickedUpAt ? ` · ${new Date(service.pickedUpAt).toLocaleString("id-ID")}` : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium">Ready for Pickup</p>
          <p className="text-xs text-muted-foreground">Device is ready to be handed over to the customer.</p>
        </div>
        <Button
          size="sm"
          className="shrink-0 h-8 gap-1.5 text-xs ml-auto"
          onClick={onVerify}
        >
          <Check className="size-3.5" />
          Verify
        </Button>
      </div>
    </div>
  );
}

/* ─── Pickup Verification Dialog ─── */

interface PickupVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug: string;
  onSuccess: () => void;
}

function PickupVerificationDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  onSuccess,
}: PickupVerificationDialogProps) {
  const [pickupName, setPickupName] = React.useState("");
  const [pickupPhone, setPickupPhone] = React.useState("");
  const [pickupRelation, setPickupRelation] = React.useState("");
  const [pickupNote, setPickupNote] = React.useState("");
  const [unitChecked, setUnitChecked] = React.useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = React.useState(false);
  const [customerAcceptedCondition, setCustomerAcceptedCondition] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPickupName("");
      setPickupPhone("");
      setPickupRelation("");
      setPickupNote("");
      setUnitChecked(false);
      setPaymentConfirmed(false);
      setCustomerAcceptedCondition(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const allChecklistDone = unitChecked && paymentConfirmed && customerAcceptedCondition;

  const handleSubmit = async () => {
    if (!pickupName.trim()) { setError("Pickup name is required."); return; }
    if (!pickupRelation.trim()) { setError("Relation is required."); return; }
    if (!allChecklistDone) { setError("All checkboxes must be checked."); return; }
    setError(null);
    setSubmitting(true);
    triggerDynamicIslandFeedback({ type: "loading", title: "Verifying pickup", description: "Processing..." });
    try {
      const response = await verifyServicePickupAction({
        brandSlug, serviceId: service.id, pickupName: pickupName.trim(),
        pickupPhone: pickupPhone.trim() || undefined, pickupRelation: pickupRelation.trim(),
        pickupNote: pickupNote.trim() || undefined,
        checklist: { unitChecked, paymentConfirmed, customerAcceptedCondition },
      });
      if (response.success) {
        triggerDynamicIslandFeedback({ type: "success", title: "Pickup verified", description: `Device handed to ${pickupName.trim()}.`, duration: 1800 });
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({ type: "error", title: "Verification failed", description: response.error ?? "Failed.", duration: 2400 });
        setError(response.error ?? "Failed.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error.";
      triggerDynamicIslandFeedback({ type: "error", title: "Verification failed", description: msg, duration: 2400 });
      setError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">Pickup Verification</DialogTitle>
          <DialogDescription className="text-xs">{service.deviceName} — {service.serviceNumber || service.id}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-3">
            {[
              { label: "Pickup Name", value: pickupName, onChange: setPickupName, placeholder: "Full name", required: true },
              { label: "Phone", value: pickupPhone, onChange: setPickupPhone, placeholder: "Phone (optional)", required: false },
            ].map((f) => (
              <div key={f.label} className="space-y-1.5">
                <Label className="text-xs font-medium">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                <Input value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} className="text-xs h-9" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Relation <span className="text-destructive">*</span></Label>
              <select value={pickupRelation} onChange={(e) => setPickupRelation(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="" disabled>Select relation</option>
                {["Self", "Family", "Friend", "Courier", "Other"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Note</Label>
              <textarea value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} placeholder="Optional note" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Verification Checklist</p>
            {[
              { label: "Unit has been checked and is in proper condition", checked: unitChecked, onChange: setUnitChecked },
              { label: "Payment has been settled", checked: paymentConfirmed, onChange: setPaymentConfirmed },
              { label: "Customer accepts the unit condition", checked: customerAcceptedCondition, onChange: setCustomerAcceptedCondition },
            ].map((c) => (
              <label key={c.label} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={c.checked} onChange={(e) => c.onChange(e.target.checked)} className="mt-0.5 size-3.5" />
                <span className="text-xs leading-relaxed">{c.label}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!pickupName.trim() || !pickupRelation.trim() || !allChecklistDone || submitting}>
            {submitting ? "Processing..." : "Confirm Pickup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
