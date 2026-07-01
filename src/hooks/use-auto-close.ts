"use client";

import { useEffect, useRef } from "react";
import { runAutoCloseScheduledAction } from "@/server/actions/auto-close.actions";

const AUTO_CLOSE_INTERVAL_MS = 5 * 60 * 1000;

export function useAutoClose() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);
  const cooldownRef = useRef(0);

  const runCheck = async () => {
    const now = Date.now();
    if (now < cooldownRef.current) return;
    cooldownRef.current = now + 30_000;

    try {
      const result = await runAutoCloseScheduledAction();
      if (!result.success) {
        console.warn("[useAutoClose] check returned error:", result.error);
        return;
      }
      if (result.data.length > 0) {
        console.log("[useAutoClose] auto-closed shifts:", result.data.length);
        window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
      }
    } catch (err) {
      console.error("[useAutoClose] check failed:", err);
    }
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    runCheck();

    intervalRef.current = setInterval(runCheck, AUTO_CLOSE_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runCheck();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      mountedRef.current = false;
    };
  }, []);
}
