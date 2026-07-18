"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface WaitingVerificationProps {
  proofUrl: string | null;
  estimatedVerificationHours: number;
}

export function WaitingVerification({
  proofUrl,
  estimatedVerificationHours,
}: WaitingVerificationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="mb-6 flex size-16 items-center justify-center rounded-full bg-amber-500/10"
      >
        <svg
          className="size-8 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </motion.div>

      <h2 className="text-lg font-semibold text-foreground">
        Bukti pembayaran telah diterima.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
        Tim kami sedang melakukan verifikasi. Proses ini biasanya memakan waktu
        maksimal {estimatedVerificationHours} jam kerja.
      </p>

      <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 px-6 py-3 text-sm">
        <span className="text-muted-foreground">Estimasi </span>
        <span className="font-semibold text-foreground">
          1×24 jam kerja
        </span>
      </div>

      {proofUrl && (
        <a
          href={proofUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Lihat bukti yang diunggah
        </a>
      )}

      <div className="mt-8 flex flex-col items-center gap-2 w-full">
        <a
          href={`https://wa.me/6281234567890?text=${encodeURIComponent("Halo Admin Seervisio. Saya ingin menanyakan status verifikasi pembayaran lisensi saya.")}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Hubungi Admin Via WhatsApp
        </a>

        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </motion.div>
  );
}
