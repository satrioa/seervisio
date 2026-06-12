"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ── Types ── */
type ShiftStatus = "NONE" | "OPEN";
type IslandMode = "welcome" | "idle" | "expanded" | "feedback";
type ActionState = "idle" | "loading" | "success" | "error" | "info";

/* ── Mock constants ── */
const MOCK_USER_NAME = "Master Admin";
const MOCK_BRANCH_NAME = "Kasservice Semarang";

/* ── Spring config ── */
const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

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

function getFeedbackDimensions(actionState: ActionState, hasDescription?: boolean) {
  if (hasDescription) {
    switch (actionState) {
      case "loading": return { width: 260, height: 58 };
      case "success": return { width: 240, height: 58 };
      case "error":   return { width: 260, height: 58 };
      case "info":    return { width: 200, height: 58 };
      default:        return { width: 200, height: 58 };
    }
  }
  switch (actionState) {
    case "loading": return { width: 260, height: 38 };
    case "success": return { width: 230, height: 38 };
    case "error":   return { width: 240, height: 38 };
    case "info":    return { width: 180, height: 38 };
    default:        return { width: 180, height: 38 };
  }
}

/* ── Inner component ── */
function SeervisIslandContent() {
  const { setSize } = useDynamicIslandSize();

  /* State */
  const [mode, setMode] = useState<IslandMode>("welcome");
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>("NONE");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");
  const shiftStartRef = useRef<Date | null>(null);
  const islandRef = useRef<HTMLDivElement | null>(null);
  const [errorShake, setErrorShake] = useState(false);

  /* Feedback dynamic text */
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

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
    if (shiftStatus !== "OPEN" || !shiftStartRef.current) return;
    const interval = setInterval(() => {
      setElapsed(formatDuration(Date.now() - shiftStartRef.current!.getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, [shiftStatus]);

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

      // Clear existing auto-dismiss timer
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }

      // Set feedback state
      setFeedbackTitle(title);
      setFeedbackDescription(description ?? null);
      setActionState(type);
      setMode("feedback");
      setSize("compact" as any);

      // Loading stays until replaced by another event
      if (type === "loading") return;

      // Error shake
      if (type === "error") {
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 500);
      }

      // Auto-dismiss after duration (default 1800ms)
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

  /* Buka Toko flow: loading → success → shift running */
  const handleBukaToko = useCallback(() => {
    setActionState("loading");
    setMode("feedback");
    setSize("compact" as any);

    setTimeout(() => {
      setActionState("success");
      setTimeout(() => {
        setShiftStatus("OPEN");
        shiftStartRef.current = new Date();
        setElapsed("00:00:00");
        setActionState("idle");
        setMode("idle");
        setIsExpanded(false);
        setSize("compact" as any);
      }, 1400);
    }, 2000);
  }, [setSize]);

  /* Demo error button */
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
    mode === "expanded" && shiftStatus === "OPEN"
      ? { width: 371, height: 150 }
      : mode === "expanded" && shiftStatus === "NONE"
        ? { width: 371, height: 150 }
        : mode === "welcome"
          ? { width: 371, height: 84 }
          : mode === "feedback"
            ? getFeedbackDimensions(actionState, !!feedbackDescription)
            : mode === "idle" && shiftStatus === "OPEN"
              ? { width: 204, height: 38 }
              : getPresetDimensions(mode === "expanded" ? "medium" : "compact");
  const initialDims =
    mode === "welcome" ? getPresetDimensions("compact") : dims;
  const islandBorderRadius = mode === "expanded" ? 20 : 46;
  const islandShadow =
    mode === "expanded" ? "0 18px 40px rgba(15, 23, 42, 0.22)" : "none";

  return (
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
      style={{ borderRadius: islandBorderRadius, boxShadow: islandShadow }}
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
                Selamat datang, {MOCK_USER_NAME}
              </span>
              <span className="truncate text-[10px] leading-tight text-white/50 dark:text-black/50">
                Pantau operasional toko dari satu tempat.
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Idle + No shift ── */}
        {mode === "idle" && shiftStatus === "NONE" && (
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
                  Buka toko untuk memulai session
                </span>
                <span className="pr-6 text-xs text-white/60 dark:text-black/60" aria-hidden="true">
                  Buka toko untuk memulai session
                </span>
              </motion.div>
            </div>
            <Button
              size="sm"
              className="h-7 shrink-0 rounded-full border-white/20 bg-white px-3 text-xs font-medium text-black hover:bg-white/90 dark:border-black/20 dark:bg-black dark:text-white dark:hover:bg-black/90"
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
        {mode === "idle" && shiftStatus === "OPEN" && (
          <motion.div
            key="idle-open"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className="flex items-center gap-2 px-4"
          >
            <Clock className="size-3.5 shrink-0 text-white/50 dark:text-black/50" />
            <span className="truncate text-xs text-white/60 dark:text-black/60">
              Shift berjalan · {elapsed}
            </span>
          </motion.div>
        )}

        {/* ── Expanded + No shift ── */}
        {mode === "expanded" && shiftStatus === "NONE" && (
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
                className="h-8 gap-1.5 rounded-full border-white/20 bg-white px-4 text-xs font-medium text-black hover:bg-white/90 dark:border-black/20 dark:bg-black dark:text-white dark:hover:bg-black/90"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBukaToko();
                }}
              >
                <Store className="size-3.5" />
                Buka Toko
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full border-white/20 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white dark:border-black/20 dark:text-black/70 dark:hover:bg-black/10 dark:hover:text-black"
                onClick={(e) => {
                  e.stopPropagation();
                  handleError();
                }}
              >
                Demo Error
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Expanded + Shift running ── */}
        {mode === "expanded" && shiftStatus === "OPEN" && (
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
              <InfoRow label="Branch" value={MOCK_BRANCH_NAME} />
              <InfoRow label="Duration" value={elapsed} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-full border-white/20 px-3 text-xs text-red-300 hover:bg-white/10 hover:text-red-200 dark:border-black/20 dark:text-red-400 dark:hover:bg-black/10 dark:hover:text-red-300"
                onClick={(e) => e.stopPropagation()}
              >
                <LogOut className="size-3.5" />
                Tutup Shift
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-full border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 dark:border-black/20 dark:bg-black/10 dark:text-black dark:hover:bg-black/20"
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
            key={`feedback-${actionState}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            className={`flex items-center justify-center whitespace-nowrap px-5 ${
              feedbackDescription
                ? "flex-col gap-0.5 py-2.5"
                : "flex-row gap-2 py-2"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionState === "loading" && (
                <Loader2 className="size-4 animate-spin text-white/50 dark:text-black/50" />
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

              <span
                className={`text-xs font-medium ${
                  actionState === "loading"
                    ? "text-white/60 dark:text-black/60"
                    : actionState === "success"
                      ? "text-green-400"
                      : actionState === "error"
                        ? "text-red-400"
                        : "text-blue-400"
                }`}
              >
                {feedbackTitle}
              </span>
            </div>

            {feedbackDescription && (
              <span
                className={`text-[9px] ${
                  actionState === "loading"
                    ? "text-white/40 dark:text-black/40"
                    : actionState === "success"
                      ? "text-green-400/60"
                      : actionState === "error"
                        ? "text-red-400/60"
                        : "text-blue-400/60"
                }`}
              >
                {feedbackDescription}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
export function SeervisDynamicIsland() {
  return (
    <DynamicIslandProvider initialSize={"medium" as any}>
      <SeervisIslandContent />
    </DynamicIslandProvider>
  );
}
