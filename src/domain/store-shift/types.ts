/**
 * Store shift domain types.
 */

export interface OpenShiftInput {
  brandId: number;
  branchId: string;
  openingCash: number;
  openingNotes?: string;
}

export interface CloseShiftInput {
  shiftId: string;
  countedClosingCash: number;
  closingNotes?: string;
}

export interface ShiftSummary {
  shiftId: string;
  shiftNumber: string;
  shiftStatus: string;
  openingCash: number;
  expectedClosingCash?: number;
  countedClosingCash?: number;
  cashDifference?: number;
  durationMinutes?: number;
  openedAt: string;
  closedAt?: string;
  openedByName?: string;
  closedByName?: string;
}
