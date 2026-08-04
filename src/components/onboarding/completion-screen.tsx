"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight, Shield, Users, Settings, BarChart3 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"


interface CompletionScreenProps {
  open: boolean
  onGoToDashboard: () => void
  completedMissionsCount: number
  totalMissionsCount: number
  role?: string
}

const ROLE_NEXT_STEPS: Record<string, { icon: React.ElementType; label: string }[]> = {
  MASTER_ADMIN: [
    { icon: Users, label: "Undang anggota tim" },
    { icon: Settings, label: "Sesuaikan pengaturan bisnis" },
    { icon: BarChart3, label: "Pantau laporan performa" },
    { icon: Shield, label: "Atur hak akses pengguna" },
  ],
  ADMIN: [
    { icon: Users, label: "Kelola data pelanggan" },
    { icon: Settings, label: "Atur layanan cabang" },
    { icon: BarChart3, label: "Pantau operasional harian" },
  ],
  FRONTLINER: [
    { icon: Users, label: "Catat servis pelanggan baru" },
    { icon: Settings, label: "Pelajari alur servis" },
  ],
  TECHNICIAN: [
    { icon: Users, label: "Lihat servis yang ditugaskan" },
    { icon: Settings, label: "Update status perbaikan" },
  ],
  CASHIER: [
    { icon: Users, label: "Proses pembayaran pelanggan" },
    { icon: Settings, label: "Pelajari POS kasir" },
  ],
  INVENTORY_STAFF: [
    { icon: Users, label: "Cek stok inventaris" },
    { icon: Settings, label: "Catat pembelian barang" },
  ],
}

export function CompletionScreen({
  open,
  onGoToDashboard,
  completedMissionsCount,
  totalMissionsCount,
  role,
}: CompletionScreenProps) {
  const percentComplete =
    totalMissionsCount > 0
      ? Math.round((completedMissionsCount / totalMissionsCount) * 100)
      : 100

  const nextSteps = role ? ROLE_NEXT_STEPS[role] ?? [] : []

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border-white/10 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-primary/10"
          >
            <CheckCircle2 className="size-10 text-primary" />
          </motion.div>

          <DialogTitle className="text-2xl font-bold tracking-tight">
            Selamat!{" "}
            {role === "MASTER_ADMIN"
              ? "Bisnis Anda Siap!"
              : "Anda Siap Beraksi!"}
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {role === "MASTER_ADMIN"
              ? "Dashboard dan fitur Seervisio sudah siap digunakan. Bisnis Anda sekarang terkelola dengan baik."
              : "Anda telah menyelesaikan orientasi Seervisio. Semua fitur sudah siap membantu produktivitas Anda."}
          </DialogDescription>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 flex justify-center"
          >
            <div className="relative flex size-[100px] items-center justify-center">
              <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="7"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 43}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 43 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 43 * (1 - percentComplete / 100) }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                />
              </svg>
              <span className="text-lg font-bold tabular-nums">{percentComplete}%</span>
            </div>
          </motion.div>

          {nextSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-6 text-left"
            >
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Langkah Selanjutnya
              </h4>
              <div className="space-y-2">
                {nextSteps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
                  >
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                      <step.icon className="size-3.5 text-primary" />
                    </div>
                    <span className="text-sm">{step.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-8"
          >
            <Button
              onClick={onGoToDashboard}
              className="w-full gap-2 rounded-xl"
              size="lg"
            >
              Ke Dashboard
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
