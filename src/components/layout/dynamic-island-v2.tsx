"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  Store,
  LogOut,
  Plus,
  Minus,
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Package,
  Landmark,
  Bot,
  Building2,
} from "lucide-react";
import type { DynamicIslandFeedbackPayload } from "@/lib/dynamic-island/dynamic-island-events";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { useStoreShift } from "@/features/store-shift/store-shift-provider";
import { StoreShiftCloseModal } from "@/components/store-shift/StoreShiftCloseModal";
import { getStoreShiftOverviewAction } from "@/server/actions/store-shift.actions";
import { cn } from "@/lib/utils";

/* ── Types ── */
type IslandMode = "welcome" | "idle" | "feedback";
type ActionState = "idle" | "loading" | "success" | "error" | "info";

interface PageContext {
  icon: React.ElementType;
  label: string;
  title: string;
}

/* ── Helpers ── */
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Page context ── */
function getPageContext(pathname: string, cash?: number | null): PageContext {
  const segment = pathname?.split("/panel/")[1]?.split("/")[0] ?? "dashboard";
  switch (segment) {
    case "dashboard":
      return { icon: LayoutDashboard, label: "Omset Hari Ini", title: cash ? `Rp${cash.toLocaleString("id-ID")}` : "Memuat..." };
    case "pos":
    case "pos-v4":
      return { icon: ShoppingCart, label: "Penjualan Hari Ini", title: cash ? `Rp${cash.toLocaleString("id-ID")}` : "Belum ada transaksi" };
    case "services":
      return { icon: Wrench, label: "Servis Aktif", title: "Perlu perhatian" };
    case "inventory":
    case "inventory-v4":
      return { icon: Package, label: "Stok Menipis", title: "Perlu direstock" };
    case "finance":
      return { icon: Landmark, label: "Saldo Kasir", title: cash ? `Rp${cash.toLocaleString("id-ID")}` : "Rp0" };
    case "ai":
      return { icon: Bot, label: "AI Insight", title: "Rekomendasi tersedia" };
    default:
      return { icon: Building2, label: segment.replace(/-/g, " "), title: "" };
  }
}

/* ── Island component ── */
function IslandContent({ userName, onOpenShift }: { userName?: string; onOpenShift?: () => void }) {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchName } = useActiveBranch();
  const displayBranchName = activeBranchName ?? "Semua Cabang";
  const { activeShift, isShiftLoading, refreshShiftStatus } = useStoreShift();

  const hasActiveShift = activeShift !== null && activeShift.shiftStatus === "OPEN";

  /* ── State ── */
  const [mode, setMode] = useState<IslandMode>("welcome");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");
  const shiftStartRef = useRef<Date | null>(null);
  const islandRef = useRef<HTMLDivElement | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [computedExpectedCash, setComputedExpectedCash] = useState<number | null>(null);
  const [bodyMaxHeight, setBodyMaxHeight] = useState<number | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const pageContext = useMemo(() => getPageContext(pathname, computedExpectedCash), [pathname, computedExpectedCash]);

  useEffect(() => { setMounted(true); }, []);

  /* ── Sync shift ── */
  useEffect(() => {
    if (mode === "welcome" || mode === "feedback") return;
    if (hasActiveShift) {
      shiftStartRef.current = new Date(activeShift!.openedAt);
      setElapsed(formatDuration(Date.now() - new Date(activeShift!.openedAt).getTime()));
    }
  }, [hasActiveShift, activeShift, mode]);

  const fetchExpectedCash = useCallback(async () => {
    if (!hasActiveShift || !activeShift?.branchId) {
      setComputedExpectedCash(null);
      return;
    }
    try {
      const res = await getStoreShiftOverviewAction(brandSlug, activeShift.branchId);
      if (res.success) setComputedExpectedCash(res.data.expectedCash);
    } catch { /* ignore */ }
  }, [hasActiveShift, activeShift?.branchId, brandSlug]);

  useEffect(() => { fetchExpectedCash(); }, [fetchExpectedCash]);

  useEffect(() => {
    const handler = () => { fetchExpectedCash(); };
    window.addEventListener("seervis:cash-transaction", handler);
    window.addEventListener("seervis:shift-changed", handler);
    return () => {
      window.removeEventListener("seervis:cash-transaction", handler);
      window.removeEventListener("seervis:shift-changed", handler);
    };
  }, [fetchExpectedCash]);

  /* ── Welcome auto-dismiss ── */
  useEffect(() => {
    if (mode === "welcome") {
      const t = setTimeout(() => setMode("idle"), 2200);
      return () => clearTimeout(t);
    }
  }, [mode]);

  /* ── Timer ── */
  useEffect(() => {
    if (!hasActiveShift || !shiftStartRef.current) return;
    const interval = setInterval(() => {
      setElapsed(formatDuration(Date.now() - shiftStartRef.current!.getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveShift]);

  /* ── Toggle with viewport calculation ── */
  const handleToggle = useCallback(() => {
    if (mode === "welcome" || actionState !== "idle") return;

    if (!isExpanded && islandRef.current) {
      const rect = islandRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.bottom - 16;
      const maxVh = window.innerHeight * 0.7;
      setBodyMaxHeight(Math.max(Math.min(available, maxVh), 180));
    }

    setIsExpanded((prev) => !prev);
  }, [mode, actionState, isExpanded]);

  const minimizeIsland = useCallback(() => {
    setIsExpanded(false);
  }, []);

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

  /* ── Feedback listener ── */
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
        feedbackTimerRef.current = null;
      }, dismissAfter);
    };
    window.addEventListener("seervis:dynamic-island-feedback", handleFeedback as EventListener);
    return () => {
      window.removeEventListener("seervis:dynamic-island-feedback", handleFeedback as EventListener);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const handleBukaToko = useCallback(() => {
    onOpenShift?.();
    minimizeIsland();
  }, [onOpenShift, minimizeIsland]);

  useEffect(() => {
    const handler = () => {
      setActionState("success");
      setMode("feedback");
      shiftStartRef.current = new Date();
      setElapsed("00:00:00");
      setTimeout(() => {
        setActionState("idle");
        setMode("idle");
        setIsExpanded(false);
      }, 1400);
    };
    window.addEventListener("seervis:shift-changed", handler);
    return () => window.removeEventListener("seervis:shift-changed", handler);
  }, []);

  const handleCashClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
    setActionState("info");
    setMode("feedback");
    setFeedbackTitle("Buka menu kas...");
    setTimeout(() => { setActionState("idle"); setMode("idle"); setFeedbackTitle(""); }, 1200);
  }, []);

  const feedbackIcon = () => {
    switch (actionState) {
      case "loading": return <Loader2 className="size-4 animate-spin text-white/70" />;
      case "success": return <CheckCircle className="size-4 text-emerald-400" />;
      case "error": return <AlertTriangle className="size-4 text-red-400" />;
      case "info": return <Info className="size-4 text-sky-400" />;
      default: return null;
    }
  };

  /* ── Render ── */
  const pillWidth = "fit-content";
  const collapsedH = 48;

  const showWelcome = mode === "welcome";
  const showFeedback = mode === "feedback";
  const showNoShift = mode !== "welcome" && mode !== "feedback" && !hasActiveShift && !isShiftLoading;
  const showLoading = mode !== "welcome" && mode !== "feedback" && isShiftLoading;
  const showShift = hasActiveShift;
  const shiftMode = mode === "idle" && hasActiveShift;
  const isOpen = shiftMode && isExpanded;

  if (!mounted) return null;

  return createPortal(
    <>
      <motion.div
        ref={islandRef}
        className={cn(
          "border backdrop-blur-xl overflow-hidden",
          "bg-[#111111] border-white/[0.05]",
          "shadow-[0_0_30px_rgba(62,207,142,.06)]",
        )}
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: pillWidth,
          maxWidth: "calc(100vw - 24px)",
          justifyContent: "center",
          borderRadius: isOpen ? 32 : 9999,
          transition: "border-radius 0.25s ease-out",
        }}
        animate={{
          height: isOpen ? "auto" : collapsedH,
          opacity: 1,
          x: errorShake ? [0, -4, 4, -4, 4, -2, 2, 0] : 0,
        }}
        initial={{ height: collapsedH, opacity: 0 }}
        transition={{
          height: { duration: 0.25, ease: "easeOut" },
          opacity: { duration: 0.2 },
          x: errorShake ? { duration: 0.4 } : { duration: 0.25 },
        }}
        onClick={!isExpanded && actionState === "idle" && mode !== "welcome" && mode !== "feedback" && hasActiveShift ? handleToggle : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isExpanded && actionState === "idle") handleToggle();
        }}
      >
        {/* ── Welcome ── */}
        {showWelcome && (
          <div className="flex h-[48px] items-center gap-3 px-4">
            <img src="/images/welcome-wave.gif" alt="" className="size-8 shrink-0 rounded-full object-cover" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-0.5 text-left">
              <span className="truncate text-xs font-medium text-white/90">Selamat datang, {userName ?? "User"}</span>
              <span className="truncate text-[10px] text-white/50">Pantau operasional toko dari satu tempat.</span>
            </div>
          </div>
        )}

        {/* ── Feedback ── */}
        {showFeedback && (
          <div className="flex h-[48px] items-center justify-center gap-2.5 px-4">
            {feedbackIcon()}
            <span className={cn(
              "text-xs font-semibold",
              actionState === "loading" && "text-white/80",
              actionState === "success" && "text-emerald-400",
              actionState === "error" && "text-red-400",
              actionState === "info" && "text-sky-400",
            )}>
              {feedbackTitle || "Processing..."}
            </span>
          </div>
        )}

        {/* ── No shift ── */}
        {showNoShift && (
          <div className="flex h-[48px] items-center justify-center gap-3 px-4">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary">
              <Store className="size-3.5 text-primary-foreground" />
            </div>
            <span className="text-xs text-white/70">Belum ada Shift Aktif</span>
            <Button
              size="sm"
              className="h-7 rounded-full bg-white px-3 text-[10px] font-medium text-zinc-900 hover:bg-white/90"
              onClick={(e) => { e.stopPropagation(); handleBukaToko(); }}
            >
              Buka Toko
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {showLoading && (
          <div className="flex h-[48px] items-center justify-center gap-2.5 px-4">
            <Loader2 className="size-4 animate-spin text-white/50" />
            <span className="text-xs text-white/60">Memuat shift...</span>
          </div>
        )}

        {/* ── Active shift ── */}
        {showShift && (
          <>
            {/* Header row */}
            <div className="flex h-[48px] items-center gap-2 px-4">
              {/* Brand capsule */}
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.06] px-2.5 py-1 min-w-0">
                <Store className="size-3 shrink-0 text-white" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-medium text-white">{displayBranchName}</p>
                  <p className="truncate text-[9px] text-white/40">{activeShift?.shiftNumber ?? ""}</p>
                </div>
              </div>

              {/* Context capsule */}
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-2.5 py-1 min-w-0">
                {React.createElement(pageContext.icon, { className: "size-3.5 shrink-0 text-black" })}
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[9px] font-medium text-black/70">{pageContext.label}</p>
                  <p className="truncate text-xs font-semibold text-black">{pageContext.title}</p>
                </div>
              </div>

              {/* Timer */}
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <Clock className="size-3 text-white/50" />
                <p className="font-mono text-xs font-bold tabular-nums text-white">{elapsed}</p>
              </div>
            </div>

            {/* Expanded body — always in DOM, takes space only when expanded */}
            <div className={isExpanded ? "" : "invisible absolute"}>
              <motion.div
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={isExpanded ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-y-auto border-t border-white/[0.05]"
                style={{ maxHeight: bodyMaxHeight }}
              >
                <div className="p-4 space-y-3">
                  {/* Cash Summary */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium tracking-wider text-white/40 uppercase">Cash Summary</p>
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2">
                      <span className="text-xs text-white/60">Saldo Awal</span>
                      <span className="text-xs font-semibold tabular-nums text-white">
                        Rp{(activeShift?.openingCash ?? 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2">
                      <span className="text-xs text-white/60">Expected Cash</span>
                      <span className="text-xs font-semibold tabular-nums text-white/90">
                        Rp{(computedExpectedCash ?? 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCashClick(); }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-transparent px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.04]"
                    >
                      <Plus className="size-3.5" /> Cash In
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCashClick(); }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.12] bg-transparent px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.04]"
                    >
                      <Minus className="size-3.5" /> Cash Out
                    </button>
                  </div>

                  {/* End Shift */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); setShowCloseModal(true); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    <LogOut className="size-3.5" /> Akhiri Shift
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>

      {activeShift && (
        <StoreShiftCloseModal
          open={showCloseModal}
          onOpenChange={setShowCloseModal}
          brandSlug={brandSlug}
          shiftId={activeShift.id}
          expectedCash={computedExpectedCash}
          onSuccess={() => { refreshShiftStatus(); }}
        />
      )}
    </>,
    document.body,
  );
}

export function DynamicIslandV2({ userName, onOpenShift }: { userName?: string; onOpenShift?: () => void }) {
  return <IslandContent userName={userName} onOpenShift={onOpenShift} />;
}
