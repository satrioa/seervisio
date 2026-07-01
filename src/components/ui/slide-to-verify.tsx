"use client";

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideToVerifyProps {
  onComplete: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  label?: string;
  loading?: boolean;
  className?: string;
}

export function SlideToVerify({
  onComplete,
  disabled = false,
  disabledMessage,
  label = "Slide to verify",
  loading = false,
  className,
}: SlideToVerifyProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const thumbSize = 36;

  const getProgress = React.useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const thumbOffset = thumbSize / 2 + 2;
    const x = clientX - rect.left - thumbOffset;
    const maxX = rect.width - thumbSize - 4;
    return Math.max(0, Math.min(x / maxX, 1));
  }, []);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (disabled || isCompleted) return;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, isCompleted],
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || disabled || isCompleted) return;
      setProgress(getProgress(e.clientX));
    },
    [isDragging, disabled, isCompleted, getProgress],
  );

  const handlePointerUp = React.useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (progress >= 0.9) {
      setIsCompleted(true);
      setTimeout(onComplete, 400);
    } else {
      setProgress(0);
    }
  }, [isDragging, progress, onComplete]);

  const fillWidth = `${progress * 100}%`;

  return (
    <div className={cn("relative", className)}>
      {disabled && disabledMessage && (
        <p className="mb-1.5 text-[10px] text-destructive text-center leading-relaxed">
          {disabledMessage}
        </p>
      )}
      <div
        ref={trackRef}
        className={cn(
          "relative h-11 w-full overflow-hidden rounded-full select-none",
          disabled ? "bg-muted/50" : "bg-muted",
        )}
      >
        <div
          className="absolute inset-0 rounded-full bg-primary transition-[width] duration-75 ease-linear"
          style={{ width: fillWidth }}
        />

        {!isCompleted && progress < 0.6 && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground pointer-events-none">
            {loading ? "Verifying..." : label}
          </span>
        )}

        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
            <Check className="size-4 text-primary-foreground" />
            <span className="text-xs font-semibold text-primary-foreground">Verified</span>
          </div>
        )}

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            "absolute top-1/2 z-10 flex items-center justify-center rounded-full shadow-md cursor-grab active:cursor-grabbing",
            disabled && "pointer-events-none opacity-50",
            isCompleted ? "bg-primary-foreground" : "bg-background hover:shadow-lg",
          )}
          style={{
            left: `calc(${progress * 100}% + 2px)`,
            width: thumbSize,
            height: thumbSize,
            transform: `translate(-50%, -50%) scale(${isDragging ? 1.12 : 1})`,
            transition: isDragging
              ? "none"
              : isCompleted
                ? "none"
                : "transform 0.2s ease, left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {isCompleted ? (
            <Check className="size-4 text-primary" />
          ) : loading ? (
            <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>

        {typeof navigator !== "undefined" && isCompleted && navigator.vibrate && navigator.vibrate(15)}
      </div>
    </div>
  );
}
