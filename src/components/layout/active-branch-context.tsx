"use client";

import * as React from "react";

export interface ActiveBranchOption {
  id: string;
  name: string;
}

interface ActiveBranchContextValue {
  activeBranchId: string | null;
  activeBranchName: string | null;
  branches: ActiveBranchOption[];
  setActiveBranchId: (branchId: string | null) => void;
  isSwitching: boolean;
  setIsSwitching: (loading: boolean) => void;
  userRole: string;
}

const ActiveBranchContext = React.createContext<ActiveBranchContextValue | null>(null);

interface ActiveBranchProviderProps {
  brandSlug: string;
  branches: ActiveBranchOption[];
  initialBranchId: string | null;
  userRole: string;
  children: React.ReactNode;
}

export function ActiveBranchProvider({
  brandSlug,
  branches,
  initialBranchId,
  userRole,
  children,
}: ActiveBranchProviderProps) {
  const ALL_BRANCHES_SENTINEL = "ALL_BRANCHES";

  const storageKey = `seervis:selected-branch:${brandSlug}`;
  const branchIds = React.useMemo(() => new Set(branches.map((branch) => branch.id)), [branches]);
  const fallbackBranchId = initialBranchId
    ? (branchIds.has(initialBranchId) ? initialBranchId : branches[0]?.id ?? null)
    : null;
  const [activeBranchId, setActiveBranchIdState] = React.useState<string | null>(fallbackBranchId);
  const [isSwitching, setIsSwitching] = React.useState(false);

  React.useEffect(() => {
    const storedBranchId = window.localStorage.getItem(storageKey);
    if (storedBranchId === ALL_BRANCHES_SENTINEL) {
      setActiveBranchIdState(null);
      return;
    }
    if (storedBranchId && branchIds.has(storedBranchId)) {
      setActiveBranchIdState(storedBranchId);
      return;
    }
    setActiveBranchIdState(fallbackBranchId);
  }, [branchIds, storageKey, fallbackBranchId]);

  const setActiveBranchId = React.useCallback((branchId: string | null) => {
    if (!branchId) {
      window.localStorage.setItem(storageKey, ALL_BRANCHES_SENTINEL);
      setActiveBranchIdState(null);
      return;
    }

    if (!branchIds.has(branchId)) {
      window.localStorage.removeItem(storageKey);
      setActiveBranchIdState(null);
      return;
    }

    window.localStorage.setItem(storageKey, branchId);
    setActiveBranchIdState(branchId);
  }, [branchIds, storageKey]);

  const activeBranchName = branches.find((branch) => branch.id === activeBranchId)?.name ?? null;

  const value = React.useMemo<ActiveBranchContextValue>(() => ({
    activeBranchId,
    activeBranchName,
    branches,
    setActiveBranchId,
    isSwitching,
    setIsSwitching,
    userRole,
  }), [activeBranchId, activeBranchName, branches, setActiveBranchId, isSwitching, userRole]);

  return (
    <ActiveBranchContext.Provider value={value}>
      {children}
    </ActiveBranchContext.Provider>
  );
}

export function useActiveBranch() {
  const context = React.useContext(ActiveBranchContext);
  if (!context) {
    throw new Error("useActiveBranch must be used inside ActiveBranchProvider");
  }
  return context;
}
