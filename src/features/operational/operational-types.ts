import type { StoreShift } from "@/types/app";

export type StoreStatus = "OPEN" | "CLOSED" | "LOADING";

export interface OperationalState {
  storeStatus: StoreStatus;
  brandSlug: string;
  branchId: string | null;
  branchName: string | null;
  shift: StoreShift | null;
  shiftDuration: string;
  shiftLabel: string;
  openingCash: number;
  currentCash: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  serviceWaiting: number;
  serviceDelayed: number;
  isLoading: boolean;
  operatorName: string | null;
}

export interface OperationalActions {
  openStore: (openingCash: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  closeStore: (actualCash: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export const OperationalState = Symbol("OperationalState");
