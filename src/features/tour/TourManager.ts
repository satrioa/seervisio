"use client";

import { driver, type Driver, type Side } from "driver.js";
import "driver.js/dist/driver.css";
import type { TourDef, TourStepDef, TourRuntimeState } from "./tour.types";
import { buildDriverStep } from "./tour.utils";
import {
  waitForElement,
  waitForRoute,
  highlightAfterRender,
  calculateOptimalPosition,
  isElementVisible,
} from "./tour-utils";

/**
 * TourManager — the ONLY place that talks to Driver.js.
 *
 * Driver.js is purely the rendering engine (spotlight, overlay, popover,
 * keyboard nav, auto-scroll). All Seervisio business logic — step
 * progression, validation, waiting state, progress persistence — lives
 * here + in the React layer (useTour / TourContext).
 *
 * The application MUST NOT call Driver.js directly. Always go through:
 *   TourManager.start(tour)
 *   TourManager.next()
 *   TourManager.previous()
 *   TourManager.complete()
 *   TourManager.skip()
 *   TourManager.resume()
 */

type StepListener = (stepIndex: number) => void;
type WaitListener = (waiting: boolean) => void;

class TourManagerImpl {
  private driver: Driver | null = null;
  private tour: TourDef | null = null;
  private stepIndex = 0;
  private waiting = false;
  private waitingStep: number | null = null;
  private destroyed = false;
  /** Brand-scoped base path (e.g. "/hira-code") captured at tour start. */
  private basePath = "";
  /** Track if we auto-opened a dialog for the current step */
  private autoOpenedDialog = false;

  /** Global listener that advances the tour when an entity is created. */
  private onEntityEvent = (e: Event) => {
    this.notifyAction(e.type);
  };

  constructor() {
    if (typeof window !== "undefined") {
      // Event names match TourStepDef.requiredAction values.
      ["branch-created", "user-created", "service-created", "payment-account-created"].forEach(
        (name) => window.addEventListener(name, this.onEntityEvent as EventListener),
      );
    }
  }

  private detachEntityListeners() {
    if (typeof window === "undefined") return;
    ["branch-created", "user-created", "service-created", "payment-account-created"].forEach(
      (name) => window.removeEventListener(name, this.onEntityEvent as EventListener),
    );
  }

  private onStepChange: StepListener | null = null;
  private onWaitChange: WaitListener | null = null;
  private onDone: (() => void) | null = null;
  private onSkipped: (() => void) | null = null;
  private onAdvance: ((tourId: string, step: number) => void) | null = null;

  /** Resolve a registry route (e.g. "/panel/branches") to the real,
   *  brand-scoped path the app actually uses. */
  private fullRoute(route?: string): string | null {
    if (!route) return null;
    return `${this.basePath}${route}`;
  }

  private currentPath(): string {
    if (typeof window === "undefined") return "";
    return window.location.pathname;
  }

  /** Register a listener fired whenever the active step changes. */
  setStepListener(fn: StepListener) {
    this.onStepChange = fn;
  }
  setWaitListener(fn: WaitListener) {
    this.onWaitChange = fn;
  }
  setDoneListener(fn: () => void) {
    this.onDone = fn;
  }
  setSkipListener(fn: () => void) {
    this.onSkipped = fn;
  }
  setAdvanceListener(fn: (tourId: string, step: number) => void) {
    this.onAdvance = fn;
  }

  getRuntimeState(): TourRuntimeState {
    return {
      status: this.tour ? (this.waiting ? "paused" : "touring") : "idle",
      tourName: this.tour?.id ?? null,
      currentStep: this.stepIndex,
      totalSteps: this.tour?.steps.length ?? 0,
      waiting: this.waiting,
      waitingStep: this.waitingStep,
    };
  }

  isActive() {
    return this.driver !== null;
  }

  /** Build a Driver.js instance for a tour definition. */
  private buildDriver(tour: TourDef) {
    const steps = tour.steps.map((step: TourStepDef, idx: number) => {
      const ds = buildDriverStep(step);
      
      return {
        ...ds,
        popover: {
          ...ds.popover,
          side: (step.placement === "center" ? "over" : step.placement || "bottom") as Side,
        },
        onHighlightStarted: async () => {
          // Before highlighting: wait for element, scroll, open dialog, expand accordion
          this.autoOpenedDialog = false;
          
          const selector = step.selector ? `[data-tour="${step.selector}"]` : null;
          if (selector) {
            const element = await highlightAfterRender(selector, {
              timeout: 10000,
              autoOpenDialog: true,
              autoExpandAccordion: true,
              scrollToView: true,
            });
            
            if (!element) {
              console.warn(`[TourManager] Element not found for step ${idx}: ${selector}`);
              // Disable Next button if element is missing
              this.disableNextButton();
            } else {
              // Track if we auto-opened a dialog
              const dialog = element.closest('[role="dialog"]');
              this.autoOpenedDialog = !!dialog;
            }
          }
        },
        onHighlighted: () => {
          // Steps that require a business action enter "waiting" mode:
          // the tour pauses until the matching entity-created event fires.
          if (step.requiredAction) {
            this.setWaiting(idx);
          }
        },
        onNextStop: () => {
          // Auto-advancing steps wait for a business action; they do
          // NOT advance when the Next button is pressed manually.
          if (step.requiredAction) return;
          this.next();
        },
        onPrevStop: () => this.previous(),
      };
    });

    return driver({
      steps,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: "rgba(15, 23, 42, 0.82)",
      overlayOpacity: 0.82,
      stagePadding: 12,
      stageRadius: 16,
      popoverOffset: 16,
      popoverClass: "seervis-tour-popover",
      progressText: `Langkah {{current}} dari {{total}}`,
      nextBtnText: "Berikut →",
      prevBtnText: "← Sebelumnya",
      doneBtnText: "Selesai",
      onPopoverRender: (popover, { config, state }) => {
        // Inject our "Lewati" (skip) control into the popover footer.
        const footer = popover.footer;
        if (footer && !footer.querySelector("[data-tour-skip]")) {
          const skip = document.createElement("button");
          skip.setAttribute("data-tour-skip", "true");
          skip.className = "seervis-tour-skip";
          skip.textContent = "Lewati";
          skip.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.skip();
          });
          footer.appendChild(skip);
        }
        // Reflect progress to listeners.
        this.emitStep(state.activeIndex ?? 0);
      },
      onDestroyed: () => {
        this.teardown();
      },
    });
  }

  /** Disable the Next button when element is missing */
  private disableNextButton() {
    const nextBtn = document.querySelector('.driver-next-btn') as HTMLButtonElement;
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.5';
      nextBtn.style.cursor = 'not-allowed';
    }
  }

  private emitStep(idx: number) {
    if (this.stepIndex === idx) return;
    this.stepIndex = idx;
    this.onStepChange?.(idx);
  }

  /** Start a tour from the beginning (or a given step). */
  async start(tour: TourDef, fromStep = 0) {
    if (typeof window === "undefined") return;
    this.destroy();
    this.tour = tour;
    this.stepIndex = Math.max(0, Math.min(fromStep, tour.steps.length - 1));
    this.waiting = false;
    this.waitingStep = null;
    this.destroyed = false;
    // Capture the brand-scoped base path so registry routes like
    // "/panel/branches" resolve to the real "/{slug}/panel/branches".
    const m = this.currentPath().match(/^\/[^/]+/);
    this.basePath = m ? m[0] : "";

    // Wait for the first step's target element to exist
    const firstStep = tour.steps[this.stepIndex];
    if (firstStep?.selector) {
      const selector = `[data-tour="${firstStep.selector}"]`;
      await highlightAfterRender(selector, {
        timeout: 10000,
        autoOpenDialog: true,
        autoExpandAccordion: true,
        scrollToView: true,
      });
      
      // Additional retry with requestAnimationFrame to ensure DOM is ready
      let element = document.querySelector(selector);
      let retries = 0;
      const maxRetries = 15;
      
      while (!element && retries < maxRetries) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 100));
        element = document.querySelector(selector);
        retries++;
      }
      
      if (!element) {
        console.warn(`[TourManager] Element not found for initial step: ${selector}`);
      }
    }

    if (this.destroyed) return;
    this.driver = this.buildDriver(tour);
    this.driver.drive(this.stepIndex);
  }

  /**
   * Advance from the current step to the next one, handling cross-page
   * tours: if the next step lives on a different route, navigate there
   * (the resume-on-navigate logic re-shows the popover on the new page).
   * Returns true if we moved/ navigated, false if there is no next step.
   */
  private async advanceToNext(): Promise<boolean> {
    if (!this.tour) return false;
    const nextIdx = this.stepIndex + 1;
    if (nextIdx >= this.tour.steps.length) return false;

    const nextStep = this.tour.steps[nextIdx];
    const targetPath = this.fullRoute(nextStep.route ?? undefined);

    if (targetPath && targetPath !== this.currentPath()) {
      // Tear down the current popover and let the route change re-mount it.
      this.stepIndex = nextIdx;
      this.clearWaiting();
      if (this.tour) this.onAdvance?.(this.tour.id, this.stepIndex);
      if (this.driver) {
        try { this.driver.destroy(); } catch { /* noop */ }
      }
      this.driver = null;
      
      // SPA navigation (handled by the panel layout) keeps the tour
      // instance alive; the resume-on-navigate logic re-shows the popover.
      window.dispatchEvent(
        new CustomEvent("seervis:tour-navigate", { detail: targetPath }),
      );
      
      // Wait for route to change and element to render
      await waitForRoute(targetPath, 5000);
      
      // Additional delay to ensure page component is fully mounted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (nextStep.selector) {
        const selector = `[data-tour="${nextStep.selector}"]`;
        await highlightAfterRender(selector, {
          timeout: 10000,
          autoOpenDialog: true,
          autoExpandAccordion: true,
          scrollToView: true,
        });
      }
      
      // Rebuild driver and drive to the new step
      if (!this.destroyed && this.tour) {
        // Ensure element exists before driving with requestAnimationFrame
        const selector = nextStep.selector ? `[data-tour="${nextStep.selector}"]` : null;
        if (selector) {
          let element = document.querySelector(selector);
          let retries = 0;
          const maxRetries = 15;
          
          while (!element && retries < maxRetries) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            await new Promise(resolve => setTimeout(resolve, 100));
            element = document.querySelector(selector);
            retries++;
          }
          
          if (!element) {
            console.warn(`[TourManager] Element still not found after retries: ${selector}`);
          }
        }
        
        // Create a filtered tour with only current and future steps
        // This prevents Driver.js from trying to access elements from previous pages
        const filteredTour: TourDef = {
          ...this.tour,
          steps: this.tour.steps.slice(this.stepIndex),
        };
        
        this.driver = this.buildDriver(filteredTour);
        this.driver.drive(0); // Drive to index 0 of filtered tour (which is our current step)
        
        // Re-enter waiting mode if the resumed step requires an action
        if (this.tour.steps[this.stepIndex]?.requiredAction) {
          this.setWaiting(this.stepIndex);
        }
      }
      
      return true;
    }

    this.stepIndex = nextIdx;
    this.clearWaiting();
    this.driver?.moveNext();
    return true;
  }

  /** Advance to the next step. */
  async next() {
    if (!this.driver) return;
    await this.advanceToNext();
  }

  /** Go back one step. */
  previous() {
    if (!this.driver) return;
    this.clearWaiting();
    this.driver.movePrevious();
  }

  /** Mark the tour finished (success). */
  complete() {
    this.onDone?.();
    this.destroy();
  }

  /** Abandon the tour (skip forever). */
  skip() {
    this.onSkipped?.();
    this.destroy();
  }

  /** Resume a previously-interrupted tour at a step. */
  async resume(tour: TourDef, step: number) {
    await this.start(tour, step);
  }

  /**
   * Put the current step into "waiting" mode — the tour pauses and
   * Dynamic Island enters Ambient Eyes until a business action fires.
   */
  setWaiting(stepIndex: number) {
    if (this.waitingStep === stepIndex) return;
    this.waiting = true;
    this.waitingStep = stepIndex;
    this.onWaitChange?.(true);
  }

  private clearWaiting() {
    if (!this.waiting) return;
    this.waiting = false;
    this.waitingStep = null;
    this.onWaitChange?.(false);
  }

  /**
   * Called by useTour when a business mutation succeeds.
   * If the active step requires that action, auto-advance.
   */
  async notifyAction(action: string) {
    if (!this.tour) return;
    const step = this.tour.steps[this.stepIndex];
    if (step?.requiredAction !== action) return;
    this.clearWaiting();
    // Small delay so the success UI is visible before moving on.
    setTimeout(async () => {
      const moved = await this.advanceToNext();
      if (!moved) {
        // Last step completed — finish the tour.
        this.complete();
      }
    }, 500);
  }

  /** Tear down the Driver.js instance (e.g. on route change). Keeps the
   *  tour + step index so it can be resumed on the next page. */
  destroy() {
    if (this.driver) {
      try {
        this.driver.destroy();
      } catch {
        /* noop */
      }
    }
    this.driver = null;
    this.tour = null;
    this.waiting = false;
    this.waitingStep = null;
    this.autoOpenedDialog = false;
  }

  /**
   * Resume the in-progress tour after a route change. Rebuilds the Driver
   * instance at the current step (waiting for the target element to mount).
   */
  async resumeCurrent() {
    if (typeof window === "undefined" || !this.tour || this.driver) return;
    this.destroyed = false;
    
    // Additional delay to ensure page component is fully mounted after navigation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Wait for the current step's element to exist
    const step = this.tour.steps[this.stepIndex];
    if (step?.selector) {
      const selector = `[data-tour="${step.selector}"]`;
      await highlightAfterRender(selector, {
        timeout: 10000,
        autoOpenDialog: true,
        autoExpandAccordion: true,
        scrollToView: true,
      });
      
      // Additional retry with requestAnimationFrame to ensure DOM is ready
      let element = document.querySelector(selector);
      let retries = 0;
      const maxRetries = 15;
      
      while (!element && retries < maxRetries) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 100));
        element = document.querySelector(selector);
        retries++;
      }
      
      if (!element) {
        console.warn(`[TourManager] Element still not found after retries in resumeCurrent: ${selector}`);
      }
    }
    
    if (this.destroyed || !this.tour) return;
    
    // Create a filtered tour with only current and future steps
    const filteredTour: TourDef = {
      ...this.tour,
      steps: this.tour.steps.slice(this.stepIndex),
    };
    
    this.driver = this.buildDriver(filteredTour);
    this.driver.drive(0); // Drive to index 0 of filtered tour
    
    // Re-enter waiting mode if the resumed step requires an action.
    if (this.tour.steps[this.stepIndex]?.requiredAction) {
      this.setWaiting(this.stepIndex);
    }
  }

  hasActiveTour() {
    return this.tour !== null;
  }

  private teardown() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.driver = null;
    // Intentionally keep `this.tour` + `this.stepIndex` so the tour can
    // resume on the next route (see resumeCurrent).
    this.waiting = false;
    this.waitingStep = null;
    this.onWaitChange?.(false);
    this.autoOpenedDialog = false;
  }
}

// Module-level singleton — one tour at a time across the app.
export const TourManager = new TourManagerImpl();
