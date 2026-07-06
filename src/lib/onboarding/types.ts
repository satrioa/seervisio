"use client";

export type OnboardingRole =
  | "MASTER_ADMIN"
  | "ADMIN"
  | "FRONTLINER"
  | "TECHNICIAN"
  | "CASHIER";

export type StepId =
  | "welcome"
  | "brand-profile"
  | "cabang"
  | "account"
  | "payment-account"
  | "payment-method"
  | "technician"
  | "frontliner"
  | "sparepart"
  | "pelanggan"
  | "servis"
  | "tracking"
  | "pos"
  | "antrian"
  | "diagnosa"
  | "status"
  | "qc"
  | "pickup"
  | "pembayaran"
  | "shift"
  | "laporan"
  | "finish";

export interface OnboardingStep {
  id: StepId;
  icon?: string;
  label: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** Detailed instructions shown after user navigates to ctaHref */
  pageInstructions?: string[];
  /** CSS selector for the element to spotlight on the target page (e.g., button or link) */
  targetSelector?: string;
  /** data-tour id for sidebar nav item spotlight */
  dataTourStepId?: string;
  validator: () => Promise<boolean>;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
}

export interface OnboardingState {
  tour_version: number;
  completed_steps: string[];
  skipped_steps: string[];
  completed_at: string | null;
  current_step_index: number;
}

export interface OnboardingFlow {
  role: OnboardingRole;
  steps: OnboardingStep[];
}
