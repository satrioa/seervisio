"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";

interface TourTooltipProps {
  index: number;
  step: any;
  size: number;
  continuous: boolean;
  backProps: any;
  closeProps: any;
  primaryProps: any;
  skipProps: any;
  tooltipProps: any;
  isLastStep: boolean;
}

export function TourTooltip({
  index,
  step,
  size,
  continuous,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}: TourTooltipProps) {
  const progress = ((index + 1) / size) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      {...(tooltipProps as any)}
      className="!max-w-md !rounded-2xl !border !border-white/10 !bg-black/85 !p-0 !shadow-2xl !shadow-black/50 !backdrop-blur-xl"
    >
      <div className="relative p-5 pb-4">
        <button
          {...closeProps}
          className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          type="button"
        >
          <X className="size-3.5" />
        </button>

        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/60">
            <span className="flex size-1.5 rounded-full bg-primary" />
            Langkah {index + 1} dari {size}
          </span>
        </div>

        <div className="mb-1 pr-6">
          <h3 className="text-base font-semibold leading-snug text-white">
            {step.title}
          </h3>
        </div>

        <div className="mb-5">
          <p className="text-sm leading-relaxed text-white/70">
            {step.content}
          </p>
        </div>

        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {index > 0 && (
              <button
                {...backProps}
                type="button"
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="size-3.5" />
                Kembali
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              {...skipProps}
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              <SkipForward className="size-3" />
              Lewati
            </button>

            {continuous && (
              <button
                {...primaryProps}
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                {isLastStep ? "Selesai" : "Lanjut"}
                {!isLastStep && <ChevronRight className="size-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
