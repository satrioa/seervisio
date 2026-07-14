import type { StoreShift } from "@/types/app";

export function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function isStoreOpen(shift: StoreShift | null | undefined): boolean {
  return shift?.shiftStatus === "OPEN";
}

export function getElapsedSince(startedAt: string | null | undefined): string {
  if (!startedAt) return "00:00:00";
  return formatDuration(Date.now() - new Date(startedAt).getTime());
}

export function getShiftLabel(startedAt: string | null | undefined): string {
  if (!startedAt) return "-";
  const hour = new Date(startedAt).getHours();
  if (hour < 11) return "Pagi";
  if (hour < 15) return "Siang";
  if (hour < 18) return "Sore";
  return "Malam";
}

export interface CashSummary {
  currentCash: number;
  expectedCash: number;
  cashDifference: number;
}

export interface ServiceQueueInfo {
  waiting: number;
  delayed: number;
}

export interface DeriveOperationalStateInput {
  shift: StoreShift | null;
  branchName: string | null;
  cashSummary: CashSummary | null;
  serviceQueue: ServiceQueueInfo;
}

export interface OperationalDerivedState {
  storeStatus: "OPEN" | "CLOSED";
  branchName: string | null;
  shift: StoreShift | null;
  openingCash: number;
  currentCash: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  serviceWaiting: number;
  serviceDelayed: number;
  shiftDuration: string;
  shiftLabel: string;
}

export function deriveOperationalState(
  input: DeriveOperationalStateInput
): OperationalDerivedState {
  const isOpen = isStoreOpen(input.shift);
  return {
    storeStatus: isOpen ? "OPEN" : "CLOSED",
    branchName: input.branchName,
    shift: input.shift,
    openingCash: input.shift?.openingCash ?? 0,
    currentCash: input.cashSummary?.currentCash ?? null,
    expectedCash: input.cashSummary?.expectedCash ?? null,
    cashDifference: input.cashSummary?.cashDifference ?? null,
    serviceWaiting: input.serviceQueue.waiting,
    serviceDelayed: input.serviceQueue.delayed,
    shiftDuration: input.shift ? getElapsedSince(input.shift.openedAt) : "00:00:00",
    shiftLabel: input.shift ? getShiftLabel(input.shift.openedAt) : "-",
  };
}
