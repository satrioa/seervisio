"use client";

import { useState, useEffect, useRef } from "react";

export function useIdleTracker(idleTimeMs = 5_000, disabled = false) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleRef = useRef(false);
  const throttleRef = useRef(0);

  const reset = () => {
    if (disabled) return;
    if (idleRef.current) {
      idleRef.current = false;
      setIsIdle(false);
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      idleRef.current = true;
      setIsIdle(true);
    }, idleTimeMs);
  };

  useEffect(() => {
    if (disabled) {
      clearTimeout(timerRef.current);
      idleRef.current = false;
      setIsIdle(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      idleRef.current = true;
      setIsIdle(true);
    }, idleTimeMs);

    const onMove = () => {
      const now = Date.now();
      if (now - throttleRef.current < 300) return;
      throttleRef.current = now;
      reset();
    };

    const onAction = () => reset();
    const onVisibility = () => {
      if (document.visibilityState === "visible") reset();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onAction, { passive: true });
    window.addEventListener("click", onAction, { passive: true });
    window.addEventListener("keydown", onAction, { passive: true });
    window.addEventListener("scroll", onAction, { passive: true });
    window.addEventListener("touchstart", onAction, { passive: true });
    window.addEventListener("focus", onAction);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onAction);
      window.removeEventListener("click", onAction);
      window.removeEventListener("keydown", onAction);
      window.removeEventListener("scroll", onAction);
      window.removeEventListener("touchstart", onAction);
      window.removeEventListener("focus", onAction);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, idleTimeMs]);

  return isIdle;
}
