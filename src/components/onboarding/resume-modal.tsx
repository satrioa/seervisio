"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Play, RotateCcw, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ResumeModalProps {
  open: boolean
  onResume: () => void
  onRestart: () => void
  onSkip: () => void
  lastMission?: string
  lastStep?: number
}

export function ResumeModal({
  open,
  onResume,
  onRestart,
  onSkip,
  lastMission,
  lastStep,
}: ResumeModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm border-white/10 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="p-6 text-center"
        >
          <DialogTitle className="text-xl font-bold tracking-tight">
            Lanjutkan Tur?
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Anda memiliki tur yang belum selesai.
            {lastMission && (
              <span className="mt-1 block">
                Terakhir di{" "}
                <span className="font-medium text-foreground">{lastMission}</span>
                {lastStep !== undefined && (
                  <span> — Langkah {lastStep}</span>
                )}
              </span>
            )}
          </DialogDescription>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={onResume}
              className="w-full gap-2 rounded-xl"
            >
              <Play className="size-4" />
              Lanjutkan
            </Button>
            <Button
              onClick={onRestart}
              variant="outline"
              className="w-full gap-2 rounded-xl"
            >
              <RotateCcw className="size-4" />
              Mulai Ulang
            </Button>
            <Button
              onClick={onSkip}
              variant="ghost"
              className="w-full text-muted-foreground"
              size="sm"
            >
              <X className="size-4" />
              Tutup
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
