"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Wrench,
  Clock,
  ShieldCheck,
  CalendarDays,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  type CustomerMock,
  type CustomerServiceRef,
  getCustomerById,
  getCustomerServices,
  formatCurrency,
  hasActiveWarranty,
} from "@/components/customers/customer-data";

/* ─── Status Badge ─── */

function ServiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "outline" | "default" | "secondary" | "destructive"; className: string }> = {
    masuk:    { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
    diagnosa: { variant: "outline", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800" },
    perbaikan:{ variant: "outline", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
    qc:       { variant: "outline", className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800" },
    selesai:  { variant: "outline", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
    batal:    { variant: "destructive", className: "" },
  };
  const config = variants[status] ?? { variant: "outline" as const, className: "" };
  return (
    <Badge variant={config.variant} className={config.className}>
      {status === "masuk" ? "Masuk" : status === "diagnosa" ? "Diagnosa" : status === "perbaikan" ? "Perbaikan" : status === "qc" ? "QC" : status === "selesai" ? "Selesai" : status === "batal" ? "Batal" : status}
    </Badge>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[10px] text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-semibold tabular-nums text-foreground">{value}</span>
      </div>
    </div>
  );
}

/* ─── Main Modal ─── */

interface CustomerDetailModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailModal({
  customerId,
  open,
  onOpenChange,
}: CustomerDetailModalProps) {
  const customer = customerId ? getCustomerById(customerId) : null;
  const services = customerId ? getCustomerServices(customerId) : [];

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">{customer.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  {customer.phone}
                  {customer.email && ` · ${customer.email}`}
                </DialogDescription>
              </div>
            </div>
            {hasActiveWarranty(customer) && (
              <Badge variant="outline" className="shrink-0 gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                <ShieldCheck className="size-3" />
                Garansi Aktif
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
          {customer.address && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span>{customer.address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-3 shrink-0" />
            <span>Pelanggan sejak {new Date(customer.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long" })}</span>
          </div>
          {customer.notes && (
            <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
              <FileText className="size-3 mt-0.5 shrink-0" />
              <span>{customer.notes}</span>
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            icon={<DollarSign className="size-4 text-white" />}
            label="Total Spend"
            value={formatCurrency(customer.totalSpend)}
            color="bg-green-500"
          />
          <StatCard
            icon={<Wrench className="size-4 text-white" />}
            label="Total Servis"
            value={String(customer.totalServices)}
            color="bg-blue-500"
          />
          <StatCard
            icon={<Loader2 className="size-4 text-white" />}
            label="Servis Aktif"
            value={String(customer.activeServices)}
            color="bg-amber-500"
          />
          <StatCard
            icon={<ShieldCheck className="size-4 text-white" />}
            label="Garansi Aktif"
            value={String(customer.activeWarranties)}
            color="bg-purple-500"
          />
        </div>

        {/* ── Service History Table ── */}
        <div>
          <h4 className="mb-2 text-xs font-semibold text-foreground">Riwayat Servis</h4>
          {services.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-6">
              <p className="text-xs text-muted-foreground">Belum ada riwayat servis</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Servis</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tanggal</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Biaya</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Garansi</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc) => (
                    <tr key={svc.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{svc.id}</span>
                          <span className="text-[10px] text-muted-foreground">{svc.deviceInfo}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <ServiceStatusBadge status={svc.status} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(svc.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {formatCurrency(svc.totalCost)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {svc.warrantyUntil ? (
                          <span className="text-[10px] text-green-600 dark:text-green-400">
                            {new Date(svc.warrantyUntil) > new Date() ? "Aktif" : "Kadaluarsa"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Close Button ── */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
