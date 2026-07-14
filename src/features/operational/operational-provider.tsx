"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { getActiveShiftAction, openStoreShiftAction, closeStoreShiftAction, getStoreShiftOverviewAction } from "@/server/actions/store-shift.actions";
import { deriveOperationalState, getElapsedSince } from "@/lib/shift-utils";
import type { StoreShift } from "@/types/app";
import type { OperationalState, OperationalActions } from "./operational-types";

export type { OperationalState, OperationalActions };

const OperationalContext = createContext<(OperationalState & OperationalActions) | null>(null);

export function OperationalProvider({ children, operatorName }: { children: React.ReactNode; operatorName?: string | null }) {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, activeBranchName } = useActiveBranch();

  const [shift, setShift] = useState<StoreShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const fetchIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;

  const refresh = useCallback(async () => {
    if (!resolvedBranchId) {
      setShift(null);
      setIsLoading(false);
      return;
    }

    const id = ++fetchIdRef.current;
    setIsLoading(true);

    try {
      const result = await getActiveShiftAction(brandSlug, resolvedBranchId);
      if (id !== fetchIdRef.current) return;

      if (result.success) {
        setShift(result.data);

        try {
          const overviewRes = await getStoreShiftOverviewAction(brandSlug, resolvedBranchId);
          if (overviewRes.success) {
            setExpectedCash(overviewRes.data.expectedCash);
          }
        } catch { /* ignore */ }
      } else {
        setShift(null);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setShift(null);
      }
    }
    if (id === fetchIdRef.current) {
      setIsLoading(false);
    }
  }, [brandSlug, resolvedBranchId]);

  /* Fetch on mount and branch change */
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* Listen for shift-changed event */
  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("seervis:shift-changed", handler);
    return () => window.removeEventListener("seervis:shift-changed", handler);
  }, [refresh]);

  /* Elapsed time ticker */
  useEffect(() => {
    if (shift?.shiftStatus === "OPEN") {
      const tick = () => setElapsed(getElapsedSince(shift.openedAt));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("00:00:00");
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shift?.id, shift?.shiftStatus, shift?.openedAt]);

  /* Open store action */
  const openStore = useCallback(async (openingCash: number, notes?: string) => {
    if (!resolvedBranchId) return { success: false, error: "No branch selected" };
    try {
      const result = await openStoreShiftAction(brandSlug, resolvedBranchId, openingCash, notes);
      if (result.success) {
        window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [brandSlug, resolvedBranchId]);

  /* Close store action */
  const closeStore = useCallback(async (actualCash: number, notes?: string) => {
    if (!shift?.id) return { success: false, error: "No active shift" };
    try {
      const result = await closeStoreShiftAction(brandSlug, shift.id, actualCash, notes);
      if (result.success) {
        window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [brandSlug, shift?.id]);

  const derived = useMemo(() => {
    const storeStatus = isLoading ? "LOADING" as const : shift?.shiftStatus === "OPEN" ? "OPEN" as const : "CLOSED" as const;
    return {
      storeStatus,
      brandSlug,
      branchId: activeBranchId,
      branchName: activeBranchName,
      shift,
      shiftDuration: elapsed,
      shiftLabel: shift ? (new Date(shift.openedAt).getHours() < 11 ? "Pagi" : new Date(shift.openedAt).getHours() < 15 ? "Siang" : new Date(shift.openedAt).getHours() < 18 ? "Sore" : "Malam") : "-",
      openingCash: shift?.openingCash ?? 0,
      currentCash: expectedCash !== null ? null : null,
      expectedCash,
      cashDifference: null,
      serviceWaiting: 0,
      serviceDelayed: 0,
      isLoading,
      operatorName: operatorName ?? null,
    };
  }, [isLoading, shift, activeBranchId, activeBranchName, elapsed, expectedCash, operatorName]);

  const actions = useMemo<OperationalActions>(() => ({
    openStore,
    closeStore,
    refresh,
  }), [openStore, closeStore, refresh]);

  const value = useMemo(() => ({ ...derived, ...actions }), [derived, actions]);

  return (
    <OperationalContext.Provider value={value}>
      {children}
    </OperationalContext.Provider>
  );
}

export function useOperational(): OperationalState & OperationalActions {
  const ctx = useContext(OperationalContext);
  if (!ctx) {
    throw new Error("useOperational must be used within an OperationalProvider");
  }
  return ctx;
}
