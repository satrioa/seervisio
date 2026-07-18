"use client";

import { motion } from "framer-motion";

export function ImportantNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
    >
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 size-4 shrink-0 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Pastikan nominal transfer sesuai dengan Total Pembayaran.</p>
          <p>
            Pembayaran akan diverifikasi maksimal 1×24 jam kerja.
          </p>
          <p>Lisensi akan aktif setelah pembayaran disetujui.</p>
        </div>
      </div>
    </motion.div>
  );
}
