"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { getActiveShiftAction } from "@/server/actions/store-shift.actions";
import type { StoreShift } from "@/types/app";

interface StoreShiftContextValue {
  activeShift: StoreShift | null;
  isShiftLoading: boolean;
  refreshShiftStatus: () => Promise<void>;
}

const StoreShiftContext = createContext<StoreShiftContextValue | null>(null);

export function StoreShiftProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId } = useActiveBranch();

  const [activeShift, setActiveShift] = useState<StoreShift | null>(null);
  const [isShiftLoading, setIsShiftLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const refreshShiftStatus = useCallback(async () => {
    const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;
    if (!resolvedBranchId) {
      setActiveShift(null);
      setIsShiftLoading(false);
      return;
    }

    const id = ++fetchIdRef.current;
    setIsShiftLoading(true);

    console.log("[store-shift:provider] refresh", {
      activeBranchId,
      resolvedBranchId,
    });

    const result = await getActiveShiftAction(brandSlug, resolvedBranchId);
    if (id !== fetchIdRef.current) return;

    if (result.success) {
      setActiveShift(result.data);
      console.log("[store-shift:provider] result", {
        activeShiftId: result.data?.id,
        status: result.data?.shiftStatus,
        openedAt: result.data?.openedAt,
      });
    } else {
      setActiveShift(null);
    }
    setIsShiftLoading(false);
  }, [brandSlug, activeBranchId]);

  useEffect(() => {
    void refreshShiftStatus();
  }, [refreshShiftStatus]);

  useEffect(() => {
    const handler = () => {
      void refreshShiftStatus();
    };
    window.addEventListener("seervis:shift-changed", handler);
    return () => window.removeEventListener("seervis:shift-changed", handler);
  }, [refreshShiftStatus]);

  const value = React.useMemo<StoreShiftContextValue>(() => ({
    activeShift,
    isShiftLoading,
    refreshShiftStatus,
  }), [activeShift, isShiftLoading, refreshShiftStatus]);

  return (
    <StoreShiftContext.Provider value={value}>
      {children}
    </StoreShiftContext.Provider>
  );
}

export function useStoreShift(): StoreShiftContextValue {
  const ctx = useContext(StoreShiftContext);
  if (!ctx) {
    throw new Error("useStoreShift must be used within a StoreShiftProvider");
  }
  return ctx;
}
