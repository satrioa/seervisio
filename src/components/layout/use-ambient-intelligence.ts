"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useOperational } from "@/features/operational/operational-provider";

export interface AmbientInsight {
  id: string;
  text: string;
  priority: number;
  category: "live_activity" | "critical_warning" | "kpi";
}

export type AmbientMode = "live_activity" | "critical_warning" | "kpi" | "idle";

export interface AmbientState {
  mode: AmbientMode;
  currentText: string | null;
}

const IDLE_MS = 15_000;
const INSIGHT_MS = 5_000;
const ACTIVITY_MS = 3_000;
const CRITICAL_MS = 8_000;

export function useAmbientIntelligence(
  activeLicense?: { status: string; expires_at: string | null; is_trial: boolean } | null,
  paused?: boolean,
): AmbientState {
  const operational = useOperational();

  const [mode, setMode] = useState<AmbientMode>("idle");
  const [currentText, setCurrentText] = useState<string | null>(null);

  const pausedRef = useRef(false);
  pausedRef.current = !!paused;

  const modeRef = useRef<AmbientMode>("idle");
  const queueRef = useRef<AmbientInsight[]>([]);
  const queueIndexRef = useRef(0);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const criticalTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  modeRef.current = mode;

  const kpiData = useMemo((): AmbientInsight[] => {
    const items: AmbientInsight[] = [];
    const t = Date.now();

    if (operational.shift && operational.shiftDuration) {
      items.push({
        id: `shift-${t}`,
        text: `Shift ${operational.shiftDuration}`,
        priority: 60,
        category: "kpi",
      });
    }

    if (operational.expectedCash !== null && operational.expectedCash > 0) {
      items.push({
        id: `revenue-${t}`,
        text: `Revenue Rp${operational.expectedCash.toLocaleString("id-ID")}`,
        priority: 70,
        category: "kpi",
      });
    }

    return items;
  }, [operational.shift, operational.shiftDuration, operational.expectedCash]);

  const criticalWarnings = useMemo((): AmbientInsight[] => {
    const w: AmbientInsight[] = [];
    if (activeLicense?.expires_at) {
      const daysLeft = Math.max(0, Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      if (daysLeft <= 5 && activeLicense.status !== "active") {
        w.push({ id: "critical-license", text: `License expires in ${daysLeft}d`, priority: 100, category: "critical_warning" });
      }
    }
    return w;
  }, [activeLicense]);

  /* ── Live activities ── */
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ text: string; priority?: number }>).detail;
      if (!detail?.text) return;
      clearTimeout(liveTimerRef.current);
      clearTimeout(idleTimerRef.current);
      clearTimeout(insightTimerRef.current);
      setMode("live_activity");
      setCurrentText(detail.text);
      liveTimerRef.current = setTimeout(() => {
        setMode("idle");
        setCurrentText(null);
        startIdleCycle();
      }, ACTIVITY_MS);
    };
    window.addEventListener("seervis:ambient-activity", handler as EventListener);
    return () => window.removeEventListener("seervis:ambient-activity", handler as EventListener);
  }, []);

  /* ── Critical warnings ── */
  useEffect(() => {
    if (criticalWarnings.length === 0) return;
    clearTimeout(liveTimerRef.current);
    clearTimeout(idleTimerRef.current);
    clearTimeout(insightTimerRef.current);
    const top = criticalWarnings.reduce((a, b) => a.priority > b.priority ? a : b);
    setMode("critical_warning");
    setCurrentText(top.text);
    criticalTimerRef.current = setTimeout(() => {
      setMode("idle");
      setCurrentText(null);
      startIdleCycle();
    }, CRITICAL_MS);
    return () => clearTimeout(criticalTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criticalWarnings.length, criticalWarnings[0]?.id]);

  const startIdleCycle = () => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(insightTimerRef.current);
    setMode("idle");
    setCurrentText(null);
    idleTimerRef.current = setTimeout(() => {
      if (pausedRef.current) {
        startIdleCycle();
        return;
      }
      const queue = queueRef.current;
      if (queue.length === 0) return;
      const sorted = [...queue].sort((a, b) => b.priority - a.priority);
      const idx = queueIndexRef.current % sorted.length;
      queueIndexRef.current += 1;
      const insight = sorted[idx];
      setMode("kpi");
      setCurrentText(insight.text);
      insightTimerRef.current = setTimeout(() => {
        startIdleCycle();
      }, INSIGHT_MS);
    }, IDLE_MS);
  };

  /* ── Keep queue data fresh without restarting timers ── */
  useEffect(() => {
    queueRef.current = kpiData;
  }, [kpiData]);

  /* ── Bootstrap the idle cycle once on mount ── */
  useEffect(() => {
    startIdleCycle();
    return () => {
      clearTimeout(idleTimerRef.current);
      clearTimeout(insightTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mode, currentText };
}
