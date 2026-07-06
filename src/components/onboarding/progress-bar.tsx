"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percent: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
  variant?: "default" | "gradient";
}

const sizeMap = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2.5",
} as const;

export function ProgressBar({
  percent,
  size = "md",
  animated = true,
  showLabel = false,
  className,
  variant = "gradient",
}: ProgressBarProps) {
  const prefersReduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percent));
  const shouldAnimate = animated && !prefersReduced;

  const fillClass = cn(
    "h-full rounded-full",
    variant === "gradient"
      ? "bg-gradient-to-r from-primary via-primary/80 to-primary/60"
      : "bg-primary",
  );

  if (!shouldAnimate) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showLabel && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {Math.round(clamped)}%
          </span>
        )}
        <div
          className={cn(
            "flex-1 rounded-full bg-muted overflow-hidden",
            sizeMap[size],
          )}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={fillClass}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
      <div
        className={cn(
          "flex-1 rounded-full bg-muted overflow-hidden",
          sizeMap[size],
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={fillClass}
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
          }}
        />
      </div>
    </div>
  );
}
