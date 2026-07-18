"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface SecondaryActionsProps {
  paymentId: string;
  invoiceNumber: string | null;
}

export function SecondaryActions({ paymentId, invoiceNumber }: SecondaryActionsProps) {
  const [replacing, setReplacing] = useState(false);

  const waMsg = invoiceNumber
    ? encodeURIComponent(
        `Halo Admin Seervisio.\n\nSaya ingin menanyakan pesanan:\nOrder ID: ${invoiceNumber}`
      )
    : "";

  async function handleReplace() {
    if (!confirm("Apakah Anda yakin ingin mengganti paket? Pesanan saat ini akan dibatalkan.")) return;
    setReplacing(true);
    try {
      const { replacePaymentAction } = await import("@/server/actions/license.actions");
      const result = await replacePaymentAction(paymentId);
      if (!result.success) {
        toast.error(result.error || "Gagal mengganti paket.");
        setReplacing(false);
        return;
      }
      window.location.href = "/license";
    } catch {
      toast.error("Gagal mengganti paket.");
      setReplacing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col items-center gap-2"
    >
      <button
        type="button"
        onClick={handleReplace}
        disabled={replacing}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm disabled:opacity-50"
      >
        {replacing && <Loader2 className="size-3 animate-spin" />}
        Ganti Paket
      </button>

      <a
        href={`https://wa.me/6281234567890?text=${waMsg}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        Hubungi WhatsApp
      </a>

      <button
        type="button"
        className="text-xs font-medium text-destructive/70 underline underline-offset-2 transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        onClick={() => {
          if (confirm("Batalkan pesanan ini?")) {
            // TODO: cancel order action
          }
        }}
      >
        Batalkan Pesanan
      </button>
    </motion.div>
  );
}
