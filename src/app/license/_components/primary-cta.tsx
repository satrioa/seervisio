"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";

interface PrimaryCtaProps {
  paymentId: string;
  packageName: string;
  invoiceNumber: string | null;
  file: File | null;
  disabled: boolean;
  onUploadComplete: (updatedPayment: any) => void;
}

const WA_PHONE = "6281234567890";

export function PrimaryCta({
  paymentId,
  packageName,
  invoiceNumber,
  file,
  disabled,
  onUploadComplete,
}: PrimaryCtaProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!file) {
      setError("Pilih file bukti transfer terlebih dahulu.");
      return;
    }

    setError(null);
    const fd = new FormData();
    fd.append("proof", file);

    startTransition(async () => {
      try {
        const { uploadLicensePaymentProofAction } = await import(
          "@/server/actions/license.actions"
        );
        const res = await uploadLicensePaymentProofAction(paymentId, fd);

        if (!res.success) {
          setError(res.error || "Gagal mengunggah bukti.");
          return;
        }

        onUploadComplete(res.data);

        // Build WhatsApp message template
        const msg = encodeURIComponent(
          [
            "Halo Admin Seervisio.",
            "",
            "Saya telah melakukan pembayaran.",
            "",
            `Order ID: ${invoiceNumber ?? paymentId}`,
            `Nama Bisnis: ${packageName}`,
            "Mohon dilakukan verifikasi.",
            "",
            "Terima kasih.",
          ].join("\n")
        );

        window.open(`https://wa.me/${WA_PHONE}?text=${msg}`, "_blank");
      } catch {
        setError("Gagal menghubungi server.");
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="space-y-3"
    >
      <button
        type="button"
        onClick={handleConfirm}
        disabled={disabled || isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Konfirmasi pembayaran"
      >
        {isPending ? (
          <>
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Mengunggah...
          </>
        ) : (
          <>
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Konfirmasi Pembayaran
          </>
        )}
      </button>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-destructive"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
