// Core types for the Guided Tour System.

export type TourPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "overview";

export type TourStatus =
  | "idle"
  | "welcome"
  | "touring"
  | "paused"
  | "completed"
  | "skipped";

export type TourModule =
  | "dashboard"
  | "inventory"
  | "finance"
  | "pos"
  | "customer"
  | "service"
  | "reports"
  | "settings"
  | "checkout";

export interface TourStepDef {
  /** Stable id used for progress tracking + registry lookup. */
  id: string;
  /** data-tour attribute used to locate the DOM target. */
  selector: string;
  title: string;
  description: string;
  placement: TourPlacement;
  module: TourModule;
  /** Required role to see this step (permission awareness). */
  permission: string;
  /**
   * If set, the step waits for this event (emitted after a
   * successful business action) before auto-advancing.
   */
  requiredAction?: string;
  /** Optional route the user should be on for this step. */
  route?: string;
  /**
   * If true, automatically open the dialog containing the target element
   * before highlighting it.
   */
  autoOpenDialog?: boolean;
  /**
   * If true, automatically expand accordion/tabs/collapse sections
   * to make the target element visible before highlighting.
   */
  autoExpandAccordion?: boolean;
}

export interface TourDef {
  /** e.g. "dashboard-v1" */
  id: string;
  name: string;
  version: number;
  module: TourModule;
  steps: TourStepDef[];
}

export interface TourProgressRow {
  id: string;
  profile_id: string;
  tour_name: string;
  tour_version: number;
  current_step: number;
  completed: boolean;
  skipped: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface TourRuntimeState {
  status: TourStatus;
  tourName: string | null;
  currentStep: number;
  totalSteps: number;
  /** When true, the tour is waiting for a user-driven action. */
  waiting: boolean;
  /** Step index that is currently waiting for requiredAction. */
  waitingStep: number | null;
}
