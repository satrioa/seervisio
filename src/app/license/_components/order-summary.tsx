"use client";

import { motion } from "framer-motion";
import { getBillingLabel, isLifetimeBilling } from "@/lib/billing/billing-helpers";

interface OrderSummaryProps {
  packageName: string;
  price: number;
  billingCycle: string;
  status: string;
  invoiceNumber: string | null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Terverifikasi",
  rejected: "Ditolak",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

export function OrderSummary({
  packageName,
  price,
  billingCycle,
  status,
  invoiceNumber,
}: OrderSummaryProps) {
  const isLifetime = isLifetimeBilling(billingCycle);
  const qtyLabel = isLifetime ? "1x Bayar, Aktif Selamanya" : "1x Bayar, 1 Bulan";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ringkasan Pesanan
      </h3>

      <div className="divide-y divide-border/60 rounded-xl border border-border/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{packageName}</span>
            <span className="text-xs text-muted-foreground">{qtyLabel}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {formatPrice(price)}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Tipe Tagihan</span>
          <span className="font-medium text-foreground">
            {getBillingLabel(billingCycle)}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span className="font-medium text-foreground">
              {STATUS_LABEL[status] ?? status}
            </span>
          </span>
        </div>

        {invoiceNumber && (
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Nomor Pesanan</span>
            <span className="font-mono text-xs font-medium text-foreground">
              {invoiceNumber}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
