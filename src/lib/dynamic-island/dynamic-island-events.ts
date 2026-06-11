/**
 * dynamic-island-events.ts
 * Global event system for triggering Dynamic Island feedback.
 *
 * Usage from any component:
 *   import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
 *
 *   triggerDynamicIslandFeedback({
 *     type: "error",
 *     title: "Perubahan status ditolak",
 *     description: "Status servis harus berpindah secara berurutan.",
 *     duration: 2200,
 *   });
 *
 * The SeervisDynamicIsland component listens for these events and
 * displays the appropriate visual feedback (loading spinner, success
 * checkmark, error shake, info icon).
 */

export type DynamicIslandFeedbackType =
  | "loading"
  | "success"
  | "error"
  | "info";

export type DynamicIslandFeedbackPayload = {
  /** Visual feedback type */
  type: DynamicIslandFeedbackType;
  /** Primary message (shown in the island text) */
  title: string;
  /** Secondary detail (shown below title when space allows) */
  description?: string;
  /** Auto-dismiss duration in ms. Default: 1800. Loading ignores this. */
  duration?: number;
};

const EVENT_NAME = "seervis:dynamic-island-feedback";

/**
 * Dispatch a CustomEvent that the Dynamic Island listens for.
 * Safe to call during SSR — returns early if window is undefined.
 */
export function triggerDynamicIslandFeedback(
  payload: DynamicIslandFeedbackPayload,
): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<DynamicIslandFeedbackPayload>(EVENT_NAME, {
      detail: payload,
    }),
  );
}
