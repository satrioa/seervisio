import type { TourModule, TourPlacement } from "./tour.types";

/**
 * Map our placement tokens onto Driver.js popover positions.
 * Driver.js accepts: top | bottom | left | right | center |
 * top-left | top-right | bottom-left | bottom-right | overiew.
 */
export function mapPlacement(placement: TourPlacement): string {
  const map: Record<TourPlacement, string> = {
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
    center: "center",
    "top-left": "top-left",
    "top-right": "top-right",
    "bottom-left": "bottom-left",
    "bottom-right": "bottom-right",
    overview: "overview",
  };
  return map[placement] ?? "bottom";
}

/** Driver.js-compatible config for a single step. */
export function buildDriverStep(
  step: import("./tour.types").TourStepDef,
) {
  return {
    element: `[data-tour="${step.selector}"]`,
    popover: {
      title: step.title,
      description: step.description,
      side: mapPlacement(step.placement) as any,
      align: "center" as any,
    },
    onHighlightStarted: () => {},
    onHighlighted: () => {},
  };
}

/** Flatten a list of tour definitions into a single ordered step list. */
export function flattenTours(tours: import("./tour.types").TourDef[]) {
  return tours.flatMap((t) => t.steps);
}

/** Check whether a role satisfies a step's permission requirement. */
export function roleCanAccess(role: string, required: string): boolean {
  if (!required) return true;
  // Simple hierarchy check — platform owner + master admin see everything.
  if (role === "PLATFORM_OWNER" || role === "MASTER_ADMIN") return true;
  return role === required;
}

export const MODULE_LABEL: Record<TourModule, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  finance: "Finance",
  pos: "POS",
  customer: "Customer",
  service: "Service",
  reports: "Reports",
  settings: "Settings",
  checkout: "Checkout",
};
