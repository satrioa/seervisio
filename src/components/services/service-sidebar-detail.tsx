"use client";

import * as React from "react";
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
  PiggyBank,
  CheckCircle,
  Coins,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import {
  type ServiceRecord,
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

interface ServiceSidebarDetailProps {
  service: ServiceRecord;
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

export function ServiceSidebarDetail({ service }: ServiceSidebarDetailProps) {
  const { showOverview } = useRightSidebar();
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [enrichedPayments, setEnrichedPayments] = React.useState<
    ServicePaymentRecord[]
  >(() => (service as any).__paymentRecords ?? []);

  const statusIndex = STATUS_ORDER.indexOf(service.status);
  const totalSparepart = getTotalSparepartCost(service.spareparts);
  const totalPaid = getTotalPayment(service.payments);
  const isPaid =
    service.payments.length > 0 &&
    service.payments.every((payment) => payment.status === "lunas");
  const isCancelled = service.status === "batal";
  const totalDueVal = Math.max(totalSparepart, 100000);
  const paymentSummary: ServicePaymentSummary = calculateServicePaymentSummary(
    totalDueVal,
    enrichedPayments,
  );
  const paymentStatusLabel = getPaymentStatusLabel(
    paymentSummary.paymentStatus,
  );

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-background px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <service.deviceIcon className="size-4 shrink-0 text-muted-foreground" />
              <h2 className="truncate text-base font-semibold">{service.id}</h2>
              <Badge className={STATUS_CONFIG[service.status].color}>
                <span className={`mr-1.5 size-1.5 rounded-full ${STATUS_CONFIG[service.status].dot}`} />
                {STATUS_CONFIG[service.status].label}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {service.deviceBrand} {service.deviceModel} Â· {service.customerName}
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
            <p className="text-sm font-medium">{service.customerName}</p>
            <p>{service.customerPhone}</p>
            {service.customerAddress && <p>{service.customerAddress}</p>}
          </InfoCard>

          <InfoCard icon={Smartphone} label="Perangkat">
            <p className="text-sm font-medium">
              {service.deviceBrand} {service.deviceModel}
            </p>
            <p>{service.deviceType}</p>
            {service.serialNumber && <p>SN: {service.serialNumber}</p>}
          </InfoCard>

          <InfoCard icon={Clock} label="Layanan">
            <p>Masuk: {service.createdAt}</p>
            <p>Update: {service.updatedAt}</p>
            {service.technician && <p>Teknisi: {service.technician}</p>}
            <p>Cabang: {service.branch}</p>
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
            {service.timeline.map((entry, index) => (
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
            ))}
          </div>
        </Section></motion.div>

        <motion.div variants={itemVariants}><Section icon={Wrench} title="Sparepart Digunakan">
          {service.spareparts.length > 0 ? (
            <div className="space-y-2">
              {service.spareparts.map((part, index) => (
                <div key={`${part.name}-${index}`} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{part.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {part.qty}x @ {formatCurrency(part.price)}
                    </p>
                  </div>
                  <p className="text-xs font-medium tabular-nums">
                    {formatCurrency(part.price * part.qty)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada sparepart digunakan</p>
          )}
        </Section></motion.div>

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

      <div className="sticky bottom-0 border-t bg-background/95 px-5 py-3 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          {!isCancelled && (
            <>
              <Button variant="outline" size="sm" className="text-xs">
                Update Status
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Tambah Sparepart
              </Button>
              {!isPaid && paymentSummary.remainingBalance > 0 && (
                <Button
                  size="sm"
                  className="col-span-2 text-xs gap-1.5"
                  onClick={() => setPaymentOpen(true)}
                >
                  <Wallet className="size-3.5" />
                  Terima Pembayaran
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={isCancelled ? "col-span-2 text-xs" : "col-span-2 text-xs"}
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
        onPaymentComplete={(payment) => {
          setEnrichedPayments((prev) => [...prev, payment]);
        }}
      />
    </div>
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
