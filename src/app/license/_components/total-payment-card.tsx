"use client";

import { motion } from "framer-motion";

interface TotalPaymentCardProps {
  totalAmount: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export function TotalPaymentCard({ totalAmount }: TotalPaymentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 25 }}
      className="rounded-xl border-2 border-primary/20 bg-primary/[0.03] p-5 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Total Pembayaran
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {formatPrice(totalAmount)}
      </p>
    </motion.div>
  );
}
