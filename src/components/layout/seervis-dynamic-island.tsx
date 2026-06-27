"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DynamicIslandProvider,
  useDynamicIslandSize,
  DynamicIslandSizePresets,
} from "@/components/ui/dynamic-island";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  Store,
  Wallet,
  LogOut,
} from "lucide-react";
import { type DynamicIslandFeedbackPayload } from "@/lib/dynamic-island/dynamic-island-events";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { useStoreShift } from "@/features/store-shift/store-shift-provider";
import { StoreShiftCloseModal } from "@/components/store-shift/StoreShiftCloseModal";

/* ── Types ── */
type IslandMode = "welcome" | "idle" | "expanded" | "feedback";
type ActionState = "idle" | "loading" | "success" | "error" | "info";

/* ── Spring config ── */
const spring = { type: "spring" as const, stiffness: 400, damping: 30 };
const feedbackTextTransition = { duration: 0.22, ease: "easeOut" as const };

/* ── Helpers ── */
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPresetDimensions(size: keyof typeof DynamicIslandSizePresets) {
  const preset = DynamicIslandSizePresets[size];
  if (!preset || preset.aspectRatio === 0) return { width: 0, height: 0 };
  const w = Math.min(preset.width, 691);
  return {
    width: w,
    height: preset.height ?? Math.round(preset.aspectRatio * w),
  };
}

function getDynamicIslandFeedbackLines(title: string, description?: string | null) {
  const lines: string[] = [];
  if (title && title.trim()) lines.push(title);
  if (description && description.trim()) lines.push(description);
  return lines;
}

function getFeedbackDimensions(actionState: ActionState) {
  const height = 44;
  switch (actionState) {
    case "loading": return { width: 280, height };
    case "success": return { width: 260, height };
    case "error":   return { width: 260, height };
    case "info":    return { width: 220, height };
    default:        return { width: 220, height };
  }
}

/* ── Inner component ── */
function SeervisIslandContent({ userName, onOpenShift }: { userName?: string; onOpenShift?: () => void }) {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { setSize } = useDynamicIslandSize();
  const { activeBranchName } = useActiveBranch();
  const displayBranchName = activeBranchName ?? "Semua Cabang";
  const { activeShift, isShiftLoading, refreshShiftStatus } = useStoreShift();

  const hasActiveShift = activeShift !== null && activeShift.shiftStatus === "OPEN";

  console.log("[dynamic-island:shift] render", {
    isShiftLoading,
    activeShiftId: activeShift?.id,
    status: activeShift?.shiftStatus,
    branchName: activeBranchName,
  });

  /* State */
  const [mode, setMode] = useState<IslandMode>("welcome");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");
  const shiftStartRef = useRef<Date | null>(null);
  const islandRef = useRef<HTMLDivElement | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  /* Feedback dynamic text */
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  const feedbackLines = useMemo(
    () => getDynamicIslandFeedbackLines(feedbackTitle, feedbackDescription),
    [feedbackTitle, feedbackDescription],
  );

  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  /* Sync active shift from provider — after welcome, set idle state */
  useEffect(() => {
    if (mode === "welcome" || mode === "feedback") return;
    if (hasActiveShift) {
      shiftStartRef.current = new Date(activeShift!.openedAt);
      setElapsed(formatDuration(Date.now() - new Date(activeShift!.openedAt).getTime()));
    }
  }, [hasActiveShift, activeShift, mode]);

  /* Ticker for multi-line feedback */
  useEffect(() => {
    setActiveLineIndex(0);
    if (feedbackLines.length <= 1) return;

    const interval = setInterval(() => {
      setActiveLineIndex((prev) => (prev + 1) % feedbackLines.length);
    }, 1600);

    return () => clearInterval(interval);
  }, [feedbackLines]);

  /* Welcome auto-transition after 2.2s */
  useEffect(() => {
    if (mode === "welcome") {
      setSize("medium" as any);
      const t = setTimeout(() => {
        setMode("idle");
        setSize("compact" as any);
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [mode, setSize]);

  /* Duration ticker when shift is open */
  useEffect(() => {
    if (!hasActiveShift || !shiftStartRef.current) return;
    const interval = setInterval(() => {
      setElapsed(formatDuration(Date.now() - shiftStartRef.current!.getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveShift]);

  /* Toggle expand/collapse */
  const handleToggle = useCallback(() => {
    if (mode === "welcome" || actionState !== "idle") return;
    if (isExpanded) {
      setIsExpanded(false);
      setMode("idle");
      setSize("compact" as any);
    } else {
      setIsExpanded(true);
      setMode("expanded");
      setSize("medium" as any);
    }
  }, [isExpanded, mode, actionState, setSize]);

  const minimizeIsland = useCallback(() => {
    if (!isExpanded || actionState !== "idle") return;
    setIsExpanded(false);
    setMode("idle");
    setSize("compact" as any);
  }, [isExpanded, actionState, setSize]);

  useEffect(() => {
    if (!isExpanded || actionState !== "idle") return;

    const handlePointerDown = (event: PointerEvent) => {
      if (islandRef.current?.contains(event.target as Node)) return;
      minimizeIsland();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", minimizeIsland, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", minimizeIsland, true);
    };
  }, [isExpanded, actionState, minimizeIsland]);

  /* ── Feedback event listener ── */
  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const detail = (event as CustomEvent<DynamicIslandFeedbackPayload>).detail;
      if (!detail) return;

      const { type, title, description, duration } = detail;

      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }

      setFeedbackTitle(title);
      setFeedbackDescription(description ?? null);
      setActionState(type);
      setMode("feedback");
      setSize("compact" as any);

      if (type === "loading") return;

      if (type === "error") {
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 500);
      }

      const dismissAfter = duration ?? 1800;
      feedbackTimerRef.current = setTimeout(() => {
        setActionState("idle");
        setMode("idle");
        setFeedbackTitle("");
        setFeedbackDescription(null);
        setSize("compact" as any);
        feedbackTimerRef.current = null;
      }, dismissAfter);
    };

    window.addEventListener(
      "seervis:dynamic-island-feedback",
      handleFeedback as EventListener,
    );
    return () => {
      window.removeEventListener(
        "seervis:dynamic-island-feedback",
        handleFeedback as EventListener,
      );
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [setSize]);

  const handleBukaToko = useCallback(() => {
    onOpenShift?.();
  }, [onOpenShift]);

  /* Listen for shift-changed event — refetch provider + show feedback */
  useEffect(() => {
    const handler = () => {
      setActionState("success");
      setMode("feedback");
      setSize("compact" as any);
      shiftStartRef.current = new Date();
      setElapsed("00:00:00");
      setTimeout(() => {
        setActionState("idle");
        setMode("idle");
        setIsExpanded(false);
        setSize("compact" as any);
      }, 1400);
    };
    window.addEventListener("seervis:shift-changed", handler);
    return () => window.removeEventListener("seervis:shift-changed", handler);
  }, [setSize]);

  const handleError = useCallback(() => {
    setActionState("error");
    setMode("feedback");
    setSize("compact" as any);
    setErrorShake(true);
    setTimeout(() => setErrorShake(false), 500);
    setTimeout(() => {
      setActionState("idle");
      setMode("idle");
      setSize("compact" as any);
    }, 2200);
  }, [setSize]);

  /* Current dimensions based on mode */
  const dims =
    mode === "expanded" && hasActiveShift
      ? { width: 371, height: 150 }
      : mode === "expanded" && !hasActiveShift
        ? { width: 371, height: 150 }
        : mode === "welcome"
          ? { width: 371, height: 84 }
          : mode === "feedback"
            ? getFeedbackDimensions(actionState)
            : mode === "idle" && hasActiveShift
              ? { width: 250, height: 44 }
              : getPresetDimensions(mode === "expanded" ? "medium" : "compact");
  const initialDims =
    mode === "welcome" ? getPresetDimensions("compact") : dims;
  const islandBorderRadius = mode === "expanded" ? 20 : 46;
  const islandShadow =
    mode === "expanded" ? "0 18px 40px rgba(15, 23, 42, 0.22)" : "none";

  return (
    <>
    <motion.div
      ref={islandRef}
      className="flex origin-center cursor-pointer items-center justify-center rounded-[46px] border border-white/10 bg-black text-white transition-colors hover:border-white/20 dark:border-black/10 dark:bg-white dark:text-black dark:hover:border-black/20"
      initial={{
        width: initialDims.width,
        height: initialDims.height,
        borderRadius: 46,
      }}
      animate={{
        width: dims.width,
        height: dims.height,
        borderRadius: islandBorderRadius,
        boxShadow: islandShadow,
        x: errorShake ? [0, -4, 4, -4, 4, -2, 2, 0] : 0,
      }}
      style={{ borderRadius: islandBorderRadius, boxShadow: islandShadow, maxWidth: "min(calc(100vw - 2rem), 371px)" }}
      transition={{
        ...spring,
        x: errorShake ? { duration: 0.4 } : spring,
      }}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleToggle();
      }}
    >
      <AnimatePresence mode="wait">
        {/* ── Welcome ── */}
        {mode === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex items-center gap-3 px-5 py-3"
          >
            <img
              src="/images/welcome-wave.gif"
              alt=""
              className="size-11 shrink-0 rounded-full object-cover"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-col gap-0.5 text-left">
              <span className="truncate text-xs font-medium text-white/90 dark:text-black/90">
                Selamat datang, {userName ?? "User"}
              </span>
              <span className="truncate text-[10px] leading-tight text-white/50 dark:text-black/50">
                Pantau operasional toko dari satu tempat.
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Idle + No shift ── */}
        {mode === "idle" && !hasActiveShift && !isShiftLoading && (
          <motion.div
            key="idle-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex w-full items-center justify-between gap-2 px-2"
          >
            <div
              className="relative min-w-0 flex-1 overflow-hidden"
              aria-label="Buka toko untuk memulai session"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
                maskImage:
                  "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
              }}
            >
              <motion.div
                className="flex w-max whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  duration: 7,
                  ease: "linear",
                  repeat: Infinity,
                }}
              >
                <span className="pr-6 text-xs text-white/60 dark:text-black/60">
                  {displayBranchName} · Buka toko untuk memulai session
                </span>
                <span className="pr-6 text-xs text-white/60 dark:text-black/60" aria-hidden="true">
                  {displayBranchName} · Buka toko untuk memulai session
                </span>
              </motion.div>
            </div>
            <Button
              size="sm"
              className="h-9 shrink-0 rounded-full border-white/20 bg-white px-3 text-xs font-medium text-black hover:bg-white/90 dark:border-black/20 dark:bg-black dark:text-white dark:hover:bg-black/90"
              onClick={(e) => {
                e.stopPropagation();
                handleBukaToko();
              }}
            >
              Buka Toko
            </Button>
          </motion.div>
        )}

        {/* ── Idle + Shift running ── */}
        {mode === "idle" && hasActiveShift && (
          <motion.div
            key="idle-open"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex items-center justify-center gap-2.5 px-5"
          >
            <Clock className="size-3.5 shrink-0 text-white/50 dark:text-black/50" />
            <span className="whitespace-nowrap text-xs text-white/80 dark:text-black/80 font-medium">
              {displayBranchName} - {elapsed}
            </span>
          </motion.div>
        )}

        {/* ── Idle + Loading ── */}
        {mode === "idle" && isShiftLoading && (
          <motion.div
            key="idle-loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex items-center justify-center gap-2.5 px-5"
          >
            <Loader2 className="size-3.5 animate-spin text-white/50 dark:text-black/50" />
            <span className="text-xs text-white/50 dark:text-black/50">Memuat shift...</span>
          </motion.div>
        )}

        {/* ── Expanded + No shift ── */}
        {mode === "expanded" && !hasActiveShift && (
          <motion.div
            key="expanded-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring}
            className="flex w-full flex-col gap-3 p-4"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white dark:text-black">Session belum dimulai</p>
              <p className="text-xs leading-relaxed text-white/50 dark:text-black/50">
                Buka toko untuk mulai mencatat transaksi, servis, dan kas hari
                ini.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-full border-white/20 bg-white px-4 text-xs font-medium text-black hover:bg-white/90 dark:border-black/20 dark:bg-black dark:text-white dark:hover:bg-black/90"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBukaToko();
                }}
              >
                <Store className="size-3.5" />
                Buka Toko
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Expanded + Shift running ── */}
        {mode === "expanded" && hasActiveShift && (
          <motion.div
            key="expanded-open"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring}
            className="flex w-full flex-col gap-3 p-4"
          >
            <div>
              <p className="text-sm font-medium text-white dark:text-black">Shift Berjalan</p>
            </div>

            <div className="space-y-1.5">
              <InfoRow label="Branch" value={displayBranchName} />
              <InfoRow label="Duration" value={elapsed} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-full border-white/20 px-3 text-xs text-red-300 hover:bg-white/10 hover:text-red-200 dark:border-black/20 dark:text-red-400 dark:hover:bg-black/10 dark:hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("idle");
                  setSize("compact" as any);
                  setIsExpanded(false);
                  setShowCloseModal(true);
                }}
              >
                <LogOut className="size-3.5" />
                Akhiri Shift
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-full border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 dark:border-black/20 dark:bg-black/10 dark:text-black dark:hover:bg-black/20"
                onClick={(e) => e.stopPropagation()}
              >
                <Wallet className="size-3.5" />
                Lihat Kas
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Feedback states ── */}
        {mode === "feedback" && (
          <motion.div
            key={`feedback-container-${actionState}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex h-full items-center justify-center gap-2.5 overflow-hidden px-5"
          >
            <div className="flex shrink-0 items-center justify-center">
              {actionState === "loading" && (
                <Loader2 className="size-4 animate-spin text-white/70 dark:text-black/70" />
              )}
              {actionState === "success" && (
                <CheckCircle className="size-4 text-green-400" />
              )}
              {actionState === "error" && (
                <AlertTriangle className="size-4 text-red-400" />
              )}
              {actionState === "info" && (
                <Info className="size-4 text-blue-400" />
              )}
            </div>

            <div className="relative h-5 min-w-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${actionState}-${activeLineIndex}-${feedbackLines[activeLineIndex]}`}
                  className={`whitespace-nowrap text-xs font-semibold ${
                    actionState === "loading"
                      ? "text-white dark:text-black"
                      : actionState === "success"
                        ? "text-green-400"
                        : actionState === "error"
                          ? "text-red-400"
                          : "text-blue-400"
                  }`}
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: 10, opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { y: -10, opacity: 0 }}
                  transition={shouldReduceMotion ? { duration: 0.15 } : feedbackTextTransition}
                >
                  {feedbackLines[activeLineIndex] || feedbackTitle || "Processing..."}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    {activeShift && (
      <StoreShiftCloseModal
        open={showCloseModal}
        onOpenChange={setShowCloseModal}
        brandSlug={brandSlug}
        shiftId={activeShift.id}
        expectedCash={activeShift.expectedClosingCash ?? null}
        onSuccess={() => { refreshShiftStatus(); }}
      />
    )}
  </>
  );
}

/* Info row sub-component */
function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-white/50 dark:text-black/50">{label}</span>
      <span
        className={`text-right text-xs font-medium ${
          highlight ? "text-amber-300" : "text-white/80 dark:text-black/80"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* Public component */
export function SeervisDynamicIsland({ userName, onOpenShift }: { userName?: string; onOpenShift?: () => void }) {
  return (
    <DynamicIslandProvider initialSize={"medium" as any}>
      <SeervisIslandContent userName={userName} onOpenShift={onOpenShift} />
    </DynamicIslandProvider>
  );
}
