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
  Store,
  QrCode,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  type ServiceRecord,
  type ServiceStatus,
  type ServicePaymentRecord,
  STATUS_CONFIG,
  STATUS_ORDER,
  formatCurrency,
  getTotalPayment,
  getPaymentStatusLabel,
} from "@/components/services/service-data";
import {
  getPickupStatus,
  type PickupStatus,
} from "@/components/services/service-data";
import { ServicePaymentPanel } from "@/components/services/service-payment-panel";
import { ServiceSparepartSection } from "@/components/services/service-sparepart-section";
import { UpdateServiceStatusDialog } from "@/components/services/update-service-status-floating-panel";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import { ReopenServiceDialog } from "@/components/services/reopen-service-dialog";
import { ServiceDetailHeader } from "@/components/services/service-detail-header";
import { ServiceActivityTimeline } from "@/components/services/service-activity-timeline";
import {
  ProcessTimelineEngine,
  type ProcessTimelineItem,
} from "@/components/matos-ui/process-timeline-engine";
import { TechnicianAssignBanner } from "@/components/services/technician-assign-banner";
import { verifyServicePickupAction, getServicePaymentPanelDataAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import {
  type PaymentSummaryRow,
  type ServicePaymentSummaryResult,
} from "@/lib/services/payment-summary";
import { SlideToVerify } from "@/components/ui/slide-to-verify";
import { RepresentativePickupDialog } from "@/components/services/pickup/representative-pickup-dialog";
import { QRVerifyPickupDialog } from "@/components/services/pickup/qr-verify-pickup-dialog";
import { ServiceBillingEditor } from "@/components/services/service-billing-editor";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canCancelService,
  normalizeServiceStatus,
  type ServiceWorkflowRole,
} from "@/domain/service/service-workflow";

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
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState<ServiceStatus>(service.status);
  const [enrichedPayments, setEnrichedPayments] = React.useState<ServicePaymentRecord[]>(() => (service as any).__paymentRecords ?? []);
  const [repDialogOpen, setRepDialogOpen] = React.useState(false);
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");
  const [billingMode, setBillingMode] = React.useState<"view" | "edit">("view");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const canSetBill = can(role as any, PERMISSIONS.SERVICE_BILLING_SET);

  React.useEffect(() => {
    setLocalStatus(service.status);
    setEnrichedPayments((service as any).__paymentRecords ?? []);
    setPaymentData(null);
  }, [service]);

  /* ESC returns to the overview (General tab) instead of closing the sheet.
     When already on the overview, we let the event through so Radix closes it.
     The capture-phase listener runs before Radix's own Escape handler; calling
     preventDefault() makes Radix skip closing. */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cancelOpen || paymentOpen) return;
      if (activeTab !== "general") {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab("general");
        scrollRef.current?.scrollTo({ top: 0 });
        return;
      }
      e.stopPropagation();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [activeTab, cancelOpen, paymentOpen]);

  console.log("[TRACE:ServiceDetailContent] received timeline length:", service.timeline?.length ?? 0, "for service:", service.id);
  if (service.timeline?.length > 0) {
    console.log("[TRACE:ServiceDetailContent] timeline sample:", JSON.stringify(service.timeline[0]));
  }

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

  const workflowStatus = normalizeServiceStatus(localStatus);
  const userRole = (role?.toUpperCase() ?? "MASTER_ADMIN") as ServiceWorkflowRole;
  const canCancel = canCancelService({ currentStatus: workflowStatus, role: userRole });

  const processTimelineItems = React.useMemo<ProcessTimelineItem[]>(() => {
    const safeStatusIndex = Math.max(0, statusIndex);
    const finalStatusIndex = Math.max(STATUS_ORDER.indexOf("selesai"), STATUS_ORDER.length - 1);
    const currentLabel = STATUS_CONFIG[localStatus]?.label ?? "Masuk";
    const progress = isCancelled
      ? 0
      : finalStatusIndex > 0
        ? Math.round((Math.min(safeStatusIndex, finalStatusIndex) / finalStatusIndex) * 100)
        : 0;
    const status: ProcessTimelineItem["status"] = isCancelled
      ? "blocked"
      : localStatus === "selesai"
        ? "complete"
        : "active";

    let badgeStatus: ProcessTimelineItem["badgeStatus"];
    if (isCancelled) {
      badgeStatus = "blocked";
    } else if (localStatus === "masuk" || localStatus === "selesai") {
      badgeStatus = "complete";
    } else if (localStatus === "menunggu_persetujuan") {
      badgeStatus = "active";
    } else {
      badgeStatus = "in-progress";
    }

    const nextStatusKey = safeStatusIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[safeStatusIndex + 1] : null;
    const nextLabel = nextStatusKey ? STATUS_CONFIG[nextStatusKey]?.label : null;
    const lastTimelineEntry = service.timeline?.[service.timeline.length - 1];
    const lastUpdateTime = lastTimelineEntry?.timestamp ?? service.updatedAt ?? service.createdAt;
    const formattedTime = formatDateTime(lastUpdateTime);
    const resultText = isCancelled ? "Dibatalkan" : nextLabel ? `Next: ${nextLabel}` : "Selesai";

    return [
      {
        id: "service-progress",
        title: "Masuk - Selesai",
        description: "Progres",
        target: currentLabel,
        rightLabel: formattedTime,
        result: resultText,
        status,
        badgeStatus,
        progress,
        badge: isCancelled ? "Dibatalkan" : currentLabel,
      },
    ];
  }, [statusIndex, isCancelled, localStatus, service.timeline, service.updatedAt, service.createdAt]);

  const totalStages = STATUS_ORDER.length - 1;
  const completedStages = isCancelled ? 0 : Math.min(Math.max(0, statusIndex), totalStages);
  const counterLabel = `${completedStages}/${totalStages}`;

  return (
    <div className="flex h-full flex-col">
      <ServiceDetailHeader
        service={service}
        localStatus={localStatus}
        onClose={onClose}
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* ═══ Pickup Banner (outside tabs) ═══ */}
        {service.status === "selesai" && (
          <div className="p-6 pb-0">
            <PickupBanner
              service={service}
              pickupStatus={getPickupStatus(service)}
              isPaid={isPaid}
              brandSlug={brandSlug}
              onPickupSuccess={() => onServiceUpdated?.()}
              onRepPickup={() => setRepDialogOpen(true)}
              onQRPickup={() => setQrDialogOpen(true)}
            />
          </div>
        )}

        {/* ═══ Technician Assignment Banner ═══ */}
        {!service.assignedTechnicianId && !service.technicianName && service.status !== "cancelled" && (
          <div className="p-6 pb-0">
            <TechnicianAssignBanner
              service={service}
              brandSlug={brandSlug}
              onAssigned={() => onServiceUpdated?.()}
            />
          </div>
        )}

        {/* ═══ Tabs ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className={service.status === "selesai" ? "mt-5" : "mt-0 pt-6"}>
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

                  {!hideStatusSteps && (
                    <ProcessTimelineEngine
                      items={processTimelineItems}
                      activeId="service-progress"
                      title="Progress Servis"
                      subtitle={isCancelled ? "Dibatalkan" : undefined}
                      counterLabel={counterLabel}
                      className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
                    />
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
              <ServiceActivityTimeline events={service.activityEvents ?? []} />
            </TabsContent>

            {/* ═══ Payment Tab ═══ */}
            <TabsContent value="payment" className="mt-0 space-y-5">
              {billingMode === "edit" ? (
                <section>
                  <ServiceBillingEditor
                    brandSlug={brandSlug}
                    serviceId={service.id}
                    estimatedCost={service.estimatedCost}
                    onSaved={() => {
                      setBillingMode("view");
                      onServiceUpdated?.();
                    }}
                    onCancel={() => setBillingMode("view")}
                  />
                </section>
              ) : (
                <section>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="size-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</span>
                      <Badge variant="outline" className={`ml-auto text-[10px] ${paymentStatusLabel.color}`}>
                        {paymentStatusLabel.label}
                      </Badge>
                    </div>

                    {summary.totalBill === 0 && !isPaid ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Wallet className="mb-3 size-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">Belum ada tagihan untuk servis ini.</p>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">Atur tagihan untuk mulai mencatat pembayaran.</p>
                        {canSetBill && (
                          <Button
                            variant="default"
                            size="sm"
                            className="mt-4 w-full text-xs"
                            onClick={() => setBillingMode("edit")}
                          >
                            <FileText className="size-3.5 mr-1.5" />
                            Atur Tagihan
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
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

                        {canSetBill && !isPaid && summary.paymentState === "UNPAID" && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground"
                              onClick={() => setBillingMode("edit")}
                            >
                              <FileText className="size-3 mr-1.5" />
                              Edit Tagihan
                            </Button>
                          </div>
                        )}

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

                        {role !== "TECHNICIAN" && !isPaid && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => setPaymentOpen(true)}
                            >
                              <Wallet className="size-3.5 mr-1.5" />
                              Receive Payment
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}
            </TabsContent>

            {/* ═══ Sparepart Tab (inline) ═══ */}
            <TabsContent value="sparepart" className="mt-0">
              <ServiceSparepartSection
                serviceId={service.id}
                serviceNumber={service.serviceNumber || service.id}
                branchId={service.branchId}
                spareparts={service.spareparts}
                currentStatus={service.status}
                onSparepartAdded={onServiceUpdated}
                brandSlug={brandSlug}
              />
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
                <div className="min-w-0 flex-1">
                  <UpdateServiceStatusDialog
                    service={displayService}
                    brandSlug={brandSlug}
                    onStatusUpdated={(status) => {
                      setLocalStatus(status);
                      onServiceUpdated?.();
                    }}
                  />
                </div>
                {canCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 shrink-0 text-xs"
                    onClick={() => setCancelOpen(true)}
                  >
                    <XCircle className="size-3.5 mr-1.5" />
                    Cancel
                  </Button>
                )}
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

      <CancelServiceDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        service={service}
        brandSlug={brandSlug}
        role={userRole}
        payments={enrichedPayments
          .filter((p) => p.status === "SUCCEEDED")
          .map((p) => ({ id: p.id, amount: p.amount, method: p.method }))}
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

      <RepresentativePickupDialog
        open={repDialogOpen}
        onOpenChange={setRepDialogOpen}
        service={service}
        brandSlug={brandSlug}
        onSuccess={() => {
          setRepDialogOpen(false);
          onServiceUpdated?.();
        }}
      />

      <QRVerifyPickupDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        service={service}
        brandSlug={brandSlug}
        onSuccess={() => {
          setQrDialogOpen(false);
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

/* ─── Pickup Banner ─── */

function PickupBanner({
  service,
  pickupStatus,
  isPaid,
  brandSlug,
  onPickupSuccess,
  onRepPickup,
  onQRPickup,
}: {
  service: ServiceRecord;
  pickupStatus: PickupStatus;
  isPaid: boolean;
  brandSlug: string;
  onPickupSuccess: () => void;
  onRepPickup: () => void;
  onQRPickup: () => void;
}) {
  const [selfSubmitting, setSelfSubmitting] = React.useState(false);

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

  const handleSelfPickup = async () => {
    if (selfSubmitting) return;
    setSelfSubmitting(true);
    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Verifying pickup",
      description: "Processing...",
    });
    try {
      const result = await verifyServicePickupAction({
        brandSlug,
        serviceId: service.id,
        pickupName: service.customerName,
        pickupRelation: "Self",
        checklist: {
          unitChecked: true,
          paymentConfirmed: true,
          customerAcceptedCondition: true,
        },
      });
      if (result.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Pickup verified",
          description: `Device picked up by customer.`,
          duration: 1800,
        });
        onPickupSuccess();
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Verification failed",
          description: result.error ?? "Failed.",
          duration: 2400,
        });
        setSelfSubmitting(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error.";
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Verification failed",
        description: msg,
        duration: 2400,
      });
      setSelfSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100">
            <Check className="size-3 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Ready for Pickup</p>
            <p className="text-xs text-muted-foreground">
              Device is ready to be handed over.
            </p>
          </div>
        </div>

        <SlideToVerify
          onComplete={handleSelfPickup}
          disabled={!isPaid}
          disabledMessage={
            !isPaid
              ? "Payment must be completed before device pickup."
              : undefined
          }
          label="Slide to confirm pickup"
          loading={selfSubmitting}
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 gap-1.5 text-xs"
            onClick={onRepPickup}
          >
            <Store className="size-3.5" />
            Picked up by representative
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onQRPickup}
          >
            <QrCode className="size-3.5" />
            QR
          </Button>
        </div>
      </div>
    </div>
  );
}
