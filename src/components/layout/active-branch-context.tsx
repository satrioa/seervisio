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
}

const ActiveBranchContext = React.createContext<ActiveBranchContextValue | null>(null);

interface ActiveBranchProviderProps {
  brandSlug: string;
  branches: ActiveBranchOption[];
  initialBranchId: string | null;
  children: React.ReactNode;
}

export function ActiveBranchProvider({
  brandSlug,
  branches,
  initialBranchId,
  children,
}: ActiveBranchProviderProps) {
  const storageKey = `seervis:selected-branch:${brandSlug}`;
  const branchIds = React.useMemo(() => new Set(branches.map((branch) => branch.id)), [branches]);
  const fallbackBranchId = initialBranchId && branchIds.has(initialBranchId)
    ? initialBranchId
    : branches[0]?.id ?? null;
  const [activeBranchId, setActiveBranchIdState] = React.useState<string | null>(fallbackBranchId);
  const [isSwitching, setIsSwitching] = React.useState(false);

  React.useEffect(() => {
    const storedBranchId = window.localStorage.getItem(storageKey);
    if (storedBranchId && branchIds.has(storedBranchId)) {
      setActiveBranchIdState(storedBranchId);
      return;
    }

    setActiveBranchIdState(fallbackBranchId);
  }, [branchIds, storageKey]);

  const setActiveBranchId = React.useCallback((branchId: string | null) => {
    if (!branchId) {
      window.localStorage.removeItem(storageKey);
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
  }), [activeBranchId, activeBranchName, branches, setActiveBranchId, isSwitching]);

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
