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
  Info,
  Store,
  LogOut,
  Circle,
} from "lucide-react";
import { type DynamicIslandFeedbackPayload } from "@/lib/dynamic-island/dynamic-island-events";
import { useOperational } from "@/features/operational/operational-provider";
import { StoreShiftCloseModal } from "@/components/store-shift/StoreShiftCloseModal";
import { useAmbientIntelligence } from "./use-ambient-intelligence";
import { useIdleTracker } from "@/hooks/use-idle-tracker";
import { AmbientEyes } from "@/components/ambient-eyes";
import { Spokes } from "@/components/spokes";
import { RouteTransitionWatcher } from "./route-transition-watcher";
import { useBrandTheme } from "@/components/theme/brand-theme-provider";
import { TrendingUpIcon, ActivityIcon, ShoppingCartIcon, CheckCheckIcon, XIcon } from "@animateicons/react/lucide";

/* ÔöÇÔöÇ Types ÔöÇÔöÇ */
type IslandMode = "welcome" | "idle" | "expanded" | "feedback";
type ActionState = "idle" | "loading" | "success" | "error" | "info";

/* ÔöÇÔöÇ Spring config ÔöÇÔöÇ */
const spring = { type: "spring" as const, stiffness: 400, damping: 30 };
const feedbackTextTransition = { duration: 0.22, ease: "easeOut" as const };

/* Apple-style content reveal: subtle opacity/translate/scale, easeOut.
   Fast enough to feel attached to the morphing capsule, never a "pop". */
const contentRevealEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const contentReveal = { duration: 0.22, ease: contentRevealEase };
const expandedContentVariants = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: contentRevealEase, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: { duration: 0.16, ease: "easeOut" as const },
  },
};
/* Time each feedback line is shown before the ticker advances. */
const FEEDBACK_LINE_INTERVAL = 1600;

/* ÔöÇÔöÇ Helpers ÔöÇÔöÇ */
function getPresetDimensions(size: keyof typeof DynamicIslandSizePresets) {
  const preset = DynamicIslandSizePresets[size];
  if (!preset || preset.aspectRatio === 0) return { width: 0, height: 0 };
  const w = Math.min(preset.width, 720);
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
  const height = 32;
  switch (actionState) {
    case "loading": return { width: 160, height };
    case "success": return { width: 150, height };
    case "error":   return { width: 150, height };
    case "info":    return { width: 140, height };
    default:        return { width: 140, height };
  }
}

/* ÔöÇÔöÇ Inner component ÔöÇÔöÇ */
function SeervisIslandContent({
  userName,
  onOpenShift,
  activeLicense,
}: {
  userName?: string;
  onOpenShift?: () => void;
  activeLicense?: { status: string; expires_at: string | null; is_trial: boolean } | null;
}) {
  const {
    storeStatus,
    brandSlug,
    branchName,
    shift,
    shiftDuration,
    shiftLabel,
    openingCash,
    currentCash,
    expectedCash,
    isLoading,
    openStore,
    closeStore,
    refresh,
  } = useOperational();

  const displayBranchName = branchName ?? "Semua Cabang";
  const hasActiveShift = storeStatus === "OPEN";

  /* UI-only state (no business state) */
  const [mode, setMode] = useState<IslandMode>("welcome");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [isExpanded, setIsExpanded] = useState(false);
  const eyesDisabled = isExpanded || mode !== "idle" || actionState !== "idle";
  const showEyes = useIdleTracker(30_000, eyesDisabled);
  const pauseAmbient = showEyes || isExpanded;

  const ambient = useAmbientIntelligence(activeLicense ?? undefined, pauseAmbient);
  const islandRef = useRef<HTMLDivElement | null>(null);
  const expandedObserverRef = useRef<ResizeObserver | null>(null);
  const [measuredExpandedHeight, setMeasuredExpandedHeight] = useState(250);

  /* Measure the expanded content so its numeric height can drive the island
     size. Uses a callback ref so measurement happens the instant the expanded
     node mounts (before paint) — avoiding the stale-value / "auto" snap that
     caused the Idle -> Expanded glitch. The ResizeObserver then keeps the
     number in sync with real content changes (e.g. Expected Cash row). */
    const handleExpandedContentRef = useCallback((node: HTMLDivElement | null) => {
    if (expandedObserverRef.current) {
      expandedObserverRef.current.disconnect();
      expandedObserverRef.current = null;
    }
    if (node) {
      setMeasuredExpandedHeight(node.offsetHeight);
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() =>
          setMeasuredExpandedHeight(node.offsetHeight)
        );
        observer.observe(node);
        expandedObserverRef.current = observer;
      }
    }
  }, []);
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
  const { mode: theme } = useBrandTheme();

  /* Theme transition pulse animation (delayed until View Transition finishes) */
  const [themePulse, setThemePulse] = useState(false);
  const prevTheme = useRef(theme);
  useEffect(() => {
    if (!shouldReduceMotion && prevTheme.current !== theme) {
      // Wait for View Transition to complete before pulsing the island
      const pulseTimer = setTimeout(() => setThemePulse(true), 40);
      const clearTimer = setTimeout(() => {
        setThemePulse(false);
      }, 540);
      prevTheme.current = theme;
      return () => {
        clearTimeout(pulseTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [theme, shouldReduceMotion]);

  /* Tour overlay removed ÔÇö island stays clean during guided tours. */

  /* Ticker for multi-line feedback */
  useEffect(() => {
    setActiveLineIndex(0);
    if (feedbackLines.length <= 1) return;

    const interval = setInterval(() => {
      setActiveLineIndex((prev) => (prev + 1) % feedbackLines.length);
    }, FEEDBACK_LINE_INTERVAL);

    return () => clearInterval(interval);
  }, [feedbackLines]);

  const { setSize } = useDynamicIslandSize();

  /* Welcome auto-transition after 2.2s */
  useEffect(() => {
    if (mode === "welcome") {
      setSize("medium" as any);
      const t = setTimeout(() => {
        setMode("idle");
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [mode, setSize]);

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

  /* ÔöÇÔöÇ Feedback event listener ÔöÇÔöÇ */
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

      if (type === "error") {
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 500);
      }

      // Auto-dismiss. Loading has no explicit follow-up in some flows, so it
      // gets a generous safety timeout instead of spinning forever (and
      // never returning to idle).
      // For multi-line feedback (title + description), make sure every line
      // gets shown by the ticker before we dismiss back to idle.
      const lineCount =
        (title?.trim() ? 1 : 0) + (description?.trim() ? 1 : 0);
      const minShowTime = lineCount * FEEDBACK_LINE_INTERVAL + 400;
      const dismissAfter =
        type === "loading"
          ? (duration ?? 8000)
          : Math.max(duration ?? 1800, minShowTime);
      feedbackTimerRef.current = setTimeout(() => {
        setActionState("idle");
        setMode("idle");
        setFeedbackTitle("");
        setFeedbackDescription(null);
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

  /* Listen for shift-changed event ÔÇö show feedback */
  useEffect(() => {
    const handler = () => {
      setActionState("success");
      setMode("feedback");
      setSize("compact" as any);
      setTimeout(() => {
        setActionState("idle");
        setMode("idle");
        setIsExpanded(false);
      }, 1400);
    };
    window.addEventListener("seervis:shift-changed", handler);
    return () => window.removeEventListener("seervis:shift-changed", handler);
  }, [setSize]);

  /* Island dimensions — width is "auto" to fit content (grid layout prevents
     collapse), height is explicit for spring animation. */
  const dims: { width: number | "auto"; height: number } =
    mode === "expanded"
      ? { width: "auto" as const, height: measuredExpandedHeight }
      : mode === "welcome"
        ? { width: "auto", height: 52 }
        : mode === "feedback"
          ? { width: "auto", height: 31 }
          : mode === "idle" && isLoading
            ? { width: "auto", height: 31 }
            : mode === "idle" && hasActiveShift && ambient.mode !== "idle"
              ? { width: "auto", height: 31 }
              : mode === "idle" && hasActiveShift && showEyes
                ? { width: "auto", height: 31 }
                  : mode === "idle" && !hasActiveShift
                    ? { width: "auto", height: 31 }
                    : { width: 150, height: 32 };
  const initialDims = dims;

  const islandBorderRadius = mode === "expanded" ? 20 : 46;
  const islandShadow =
    mode === "expanded" ? "0 18px 40px rgba(15, 23, 42, 0.22)" : "none";

  return (
    <>
      <motion.div
        ref={islandRef}
        data-island-root
        data-tour="dynamic-island"
        className="relative flex origin-center cursor-pointer items-stretch overflow-hidden rounded-[46px] border border-white/10 bg-black text-white transition-colors hover:border-white/20 dark:border-white/10 dark:bg-[#262626] dark:text-white dark:hover:border-white/20"
        initial={{
          borderRadius: 36,
        }}
        animate={{
          width: dims.width,
          height: dims.height,
          borderRadius: islandBorderRadius,
          boxShadow: islandShadow,
          x: errorShake ? [0, -4, 4, -4, 4, -2, 2, 0] : 0,
          scale: themePulse ? [1, 1.06, 1] : 1,
          borderColor: themePulse
            ? ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0.1)"]
            : "rgba(255,255,255,0.1)",
        }}
        style={{ borderRadius: islandBorderRadius, boxShadow: islandShadow, maxWidth: "min(calc(100vw - 2rem), 560px)" }}
      transition={{
        ...spring,
        x: errorShake ? { duration: 0.4 } : spring,
        scale: themePulse
          ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0 },
        borderColor: themePulse
          ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0 },
      }}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleToggle();
      }}
    >
      {/* ÔöÇÔöÇ Dither overlay (top layer) while in ambient-eyes mode ÔöÇÔöÇ */}
      {mode === "idle" && hasActiveShift && ambient.mode === "idle" && showEyes && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 opacity-[0.10] mix-blend-screen"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(255,255,255,0.6) 0.5px, transparent 0.6px)",
            backgroundSize: "2.5px 2.5px",
          }}
        />
      )}

      <div className="grid grid-cols-1">
      <AnimatePresence>
        {/* ── Welcome ── */}
        {mode === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={contentReveal}
            className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 px-2 py-2"
          >
            <img
              src="/images/welcome-wave.gif"
              alt=""
              className="size-11 shrink-0 rounded-full object-cover"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-col gap-0.5 text-left">
              <span className="truncate text-xs font-medium text-white/90 dark:text-white/90">
                Selamat datang, {userName ?? "User"}
              </span>
              <span className="truncate text-[10px] leading-tight text-white/50 dark:text-white/50">
                Pantau operasional toko dari satu tempat.
              </span>
            </div>
          </motion.div>
        )}

        {/* ÔöÇÔöÇ Idle + No shift ÔöÇÔöÇ */}
        {mode === "idle" && !hasActiveShift && !isLoading && (
          <motion.div
            key="idle-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={contentReveal}
            className="col-start-1 row-start-1 flex min-w-0 items-stretch justify-center gap-2 p-px"
          >
            <div
              className="relative flex min-w-0 flex-1 items-center overflow-hidden"
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
                <span className="pr-6 text-xs text-white/60 dark:text-white/60">
                  {displayBranchName} ⁕ Buka toko untuk memulai session
                </span>
                <span className="pr-6 text-xs text-white/60 dark:text-white/60" aria-hidden="true">
                  {displayBranchName} ⁕ Buka toko untuk memulai session
                </span>
              </motion.div>
            </div>
            <Button
              size="xs"
              className="h-full shrink-0 rounded-full border-white/20 bg-white px-3 text-xs font-medium text-black hover:bg-white/90 dark:border-white/10 dark:bg-black dark:text-white dark:hover:bg-black/90"
              onClick={(e) => {
                e.stopPropagation();
                handleBukaToko();
              }}
            >
              Buka Toko
            </Button>
          </motion.div>
        )}

        {/* ÔöÇÔöÇ Idle + Shift running ÔåÆ Ambient Intelligence ÔöÇÔöÇ */}
        {mode === "idle" && hasActiveShift && (
          <motion.div
            key={ambient.mode === "idle" && showEyes ? "ambient-eyes" : ambient.mode === "idle" ? "ambient-idle" : `ambient-${ambient.currentText?.slice(0, 20) ?? "kpi"}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 px-2 py-2 "
          >
            {ambient.mode === "idle" && showEyes ? (
              <div className="flex w-full items-center justify-center text-white/40 dark:text-white/40">
              <AmbientEyes />
              </div>
            ) : ambient.mode === "idle" ? (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-green-400/80" />
                <span className="items-center whitespace-nowrap text-xs font-medium text-white/80 dark:text-white/80">
                  {displayBranchName}
                </span>
                <span className="text-[10px] text-white/40 dark:text-white/40 tabular-nums">
                  {shiftDuration}
                </span>
              </>
            ) : ambient.mode === "critical_warning" ? (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-red-400" />
                <span className="whitespace-nowrap text-xs font-medium text-red-300 dark:text-red-400">
                  {ambient.currentText}
                </span>
              </>
            ) : ambient.currentText?.startsWith("Revenue") ? (
              <>
                <TrendingUpIcon size={14} isAnimated color="currentColor" />
                <span className="whitespace-nowrap text-xs text-white/80 dark:text-white/80">
                  {ambient.currentText}
                </span>
              </>
            ) : ambient.currentText?.startsWith("Shift") ? (
              <>
                <ActivityIcon size={14} isAnimated color="currentColor" />
                <span className="whitespace-nowrap text-xs text-white/80 dark:text-white/80">
                  {ambient.currentText}
                </span>
              </>
            ) : ambient.currentText?.startsWith("Transaksi") ? (
              <>
                <ShoppingCartIcon size={14} isAnimated color="currentColor" />
                <span className="whitespace-nowrap text-xs text-white/80 dark:text-white/80">
                  {ambient.currentText}
                </span>
              </>
            ) : ambient.currentText?.startsWith("Servis") ? (
              <>
                <CheckCheckIcon size={14} isAnimated color="currentColor" />
                <span className="whitespace-nowrap text-xs text-white/80 dark:text-white/80">
                  {ambient.currentText}
                </span>
              </>
            ) : (
              <>
                <span className="whitespace-nowrap text-xs text-white/80 dark:text-white/80">
                  {ambient.currentText}
                </span>
              </>
            )}
          </motion.div>
        )}

        {/* ÔöÇÔöÇ Idle + Loading ÔöÇÔöÇ */}
        {mode === "idle" && isLoading && (
          <motion.div
            key="idle-loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={contentReveal}
            className="col-start-1 row-start-1 flex min-w-0 items-center justify-center gap-2.5 px-2 py-2"
          >
            <Loader2 className="size-3.5 animate-spin text-white/100 dark:text-white/100" />
            <span className="text-xs text-white/50 dark:text-white/50">Memuat shift...</span>
          </motion.div>
        )}

        {/* ÔöÇÔöÇ Expanded + No shift ÔöÇÔöÇ */}
        {mode === "expanded" && !hasActiveShift && (
          <motion.div
            key="expanded-none"
            variants={expandedContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="col-start-1 row-start-1 flex min-w-0 flex-col gap-6 self-start p-0.5"
            ref={handleExpandedContentRef}
          >
            <div className="space-y-1 px-3 pb-16 pt-3"  >
              <p className="text-sm font-medium text-white dark:text-white">Session belum dimulai</p>
              <p className="text-xs leading-relaxed text-white/50 dark:text-white/50">
                Buka toko untuk mulai mencatat transaksi, servis, dan kas hari
                ini.
              </p>
            </div>
          </motion.div>
        )}

        {/* ÔöÇÔöÇ Expanded + Shift running ÔöÇÔöÇ */}
        {mode === "expanded" && hasActiveShift && (
          <motion.div
            key="expanded-open"
            variants={expandedContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="col-start-1 row-start-1 flex min-w-0 flex-col gap-3 self-start px-3 py-3"
            ref={handleExpandedContentRef}
          >
            <div className="flex items-center gap-2 min-w-[320px]">
              <Circle className="size-2.5 shrink-0 fill-green-400 text-green-400" />
              <p className="text-sm font-medium text-white dark:text-white">
                {displayBranchName} ● {shiftLabel}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 pb-12">
              <InfoRow label="Duration" value={shiftDuration} />
              {expectedCash !== null && (
                <InfoRow label="Expected Cash" value={`Rp${expectedCash.toLocaleString("id-ID")}`} />
              )}
            </div>
          </motion.div>
        )}

        {/* ÔöÇÔöÇ Feedback states ÔöÇÔöÇ */}
        {mode === "feedback" && (
          <motion.div
            key={`feedback-container-${actionState}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={contentReveal}
            className="col-start-1 row-start-1 flex min-w-0 items-center justify-center gap-2.5 overflow-hidden px-2 py-2"
          >
            <div className="flex shrink-0 items-center justify-center">
              {actionState === "loading" && (
                <Spokes className="size-[18px] text-white/70 dark:text-white/70" style={{ "--duration": "0.9s" } as React.CSSProperties} />
              )}
              {actionState === "success" && (
                <CheckCheckIcon size={16} isAnimated color="currentColor" className="text-green-400" />
              )}
              {actionState === "error" && (
                <XIcon size={16} isAnimated color="currentColor" className="text-red-400" />
              )}
              {actionState === "info" && (
                <Info className="size-4 text-blue-400" />
              )}
            </div>

            <div className="relative h-5 min-w-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${actionState}-${activeLineIndex}-${feedbackLines[activeLineIndex]}`}
                  className="whitespace-nowrap text-xs font-semibold text-white"
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
      </div>

      {/* Bottom-anchored action button: pinned to the container's bottom edge
          so it rides the spring's bounce during the morph (parallel reveal). */}
      <AnimatePresence>
        {mode === "expanded" && (
          <motion.div
            key="expanded-action"
            variants={expandedContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-3"
          >
            {hasActiveShift ? (
              <Button
                size="sm"
                variant="destructive"
                className="pointer-events-auto h-9 w-full gap-1.5 rounded-full px-3 text-xs"
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
            ) : (
              <Button
                size="sm"
                className="pointer-events-auto h-9 w-full gap-1.5 rounded-xl border-white/20 bg-white px-4 text-xs font-medium text-black hover:bg-white/90 dark:border-white/10 dark:bg-black dark:text-white dark:hover:bg-black/90"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBukaToko();
                }}
              >
                <Store className="size-3.5" />
                Buka Toko
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    {shift && (
      <StoreShiftCloseModal
        open={showCloseModal}
        onOpenChange={setShowCloseModal}
        brandSlug={brandSlug}
        shiftId={shift.id}
        expectedCash={expectedCash}
        onSuccess={() => { void refresh(); }}
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
      <span className="text-[11px] text-white/50 dark:text-white/50">{label}</span>
      <span
        className={`text-right text-xs font-medium ${
          highlight ? "text-amber-300" : "text-white/80 dark:text-white/80"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* Public component */
export function SeervisDynamicIsland({
  userName,
  onOpenShift,
  activeLicense,
}: {
  userName?: string;
  onOpenShift?: () => void;
  activeLicense?: { status: string; expires_at: string | null; is_trial: boolean } | null;
}) {
  return (
    <DynamicIslandProvider initialSize={"medium" as any}>
      <RouteTransitionWatcher />
      <SeervisIslandContent userName={userName} onOpenShift={onOpenShift} activeLicense={activeLicense} />
    </DynamicIslandProvider>
  );
}
