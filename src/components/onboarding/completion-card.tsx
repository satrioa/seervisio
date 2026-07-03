"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompletionCardProps {
  userName: string;
  onGoToDashboard: () => void;
}

export function CompletionCard({ userName, onGoToDashboard }: CompletionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-md"
    >
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 via-background to-background p-8 text-center shadow-xl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-primary/10"
        >
          <CheckCircle2 className="size-10 text-primary" />
        </motion.div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight">
          Siap Beraksi, {userName}!
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Anda telah menyelesaikan orientasi Seervisio. Sekarang saatnya
          menaklukkan hari dengan fitur-fitur luar biasa yang sudah siap
          membantu produktivitas Anda.
        </p>

        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Zap className="size-3.5 text-amber-500" />
          <span>Tips: Gunakan shortcut keyboard untuk navigasi lebih cepat</span>
        </div>

        <Button
          onClick={onGoToDashboard}
          className="w-full gap-2 rounded-xl"
          size="lg"
        >
          Mulai Bekerja
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}
