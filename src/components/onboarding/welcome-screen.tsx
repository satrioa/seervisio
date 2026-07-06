"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Sparkles, Clock, MapPin } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
  open: boolean
  onStart: () => void
  onSkip: () => void
  estimatedTime?: string
  missionsCount?: number
  role?: string
}

const ROLE_LABELS: Record<string, string> = {
  MASTER_ADMIN: "Pemilik Bisnis",
  ADMIN: "Admin Cabang",
  FRONTLINER: "Frontliner",
  TECHNICIAN: "Teknisi",
  CASHIER: "Kasir",
  INVENTORY_STAFF: "Staf Inventaris",
}

export function WelcomeScreen({
  open,
  onStart,
  onSkip,
  estimatedTime = "5-10 menit",
  missionsCount = 5,
  role,
}: WelcomeScreenProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
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
            className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5"
          >
            <Sparkles className="size-7 text-primary" />
          </motion.div>

          <DialogTitle className="text-2xl font-bold tracking-tight">
            {role ? `Selamat Datang, ${ROLE_LABELS[role] ?? role}!` : "Selamat Datang di Seervisio"}
          </DialogTitle>

          <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Mari kita jelajahi Seervisio bersama! Tur interaktif ini akan
            memandu Anda melalui fitur-fitur utama yang relevan dengan peran
            Anda, sehingga Anda bisa langsung produktif.
          </DialogDescription>

          <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>{estimatedTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              <span>{missionsCount} misi</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={onStart}
              className="w-full gap-2 rounded-xl"
              size="lg"
            >
              Mulai Tur
            </Button>
            <Button
              onClick={onSkip}
              variant="ghost"
              className="w-full text-muted-foreground"
              size="sm"
            >
              Lewati, nanti saja
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
