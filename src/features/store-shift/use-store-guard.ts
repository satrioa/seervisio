"use client";

import { useCallback, useRef, useState } from "react";
import { useStoreShift } from "./store-shift-provider";

export function useStoreGuard() {
  const { activeShift, isShiftLoading } = useStoreShift();
  const pendingActionRef = useRef<(() => void) | null>(null);
  const [showGuardDialog, setShowGuardDialog] = useState(false);
  const [storeGuardBranchId, setStoreGuardBranchId] = useState<string>("");

  const isStoreOpen = !!activeShift && activeShift.shiftStatus === "OPEN";

  const guardAction = useCallback((branchId: string, action: () => void) => {
    if (isStoreOpen) {
      action();
    } else {
      pendingActionRef.current = action;
      setStoreGuardBranchId(branchId);
      setShowGuardDialog(true);
    }
  }, [isStoreOpen]);

  const clearPending = useCallback(() => {
    pendingActionRef.current = null;
    setShowGuardDialog(false);
  }, []);

  const executePending = useCallback(() => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    setShowGuardDialog(false);
    if (pending) {
      pending();
    }
  }, []);

  return {
    isStoreOpen,
    isShiftLoading,
    showGuardDialog,
    setShowGuardDialog,
    storeGuardBranchId,
    guardAction,
    clearPending,
    executePending,
  };
}
