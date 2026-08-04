"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { TourManager } from "./TourManager";
import type { TourDef, TourRuntimeState, TourStatus } from "./tour.types";
import { getTour } from "./TourRegistry";

interface TourContextValue {
  status: TourStatus;
  state: TourRuntimeState;
  activeTour: TourDef | null;
  /** Start a named tour (resumes from saved progress if present). */
  startTour: (name: string, fromStep?: number) => Promise<void>;
  /** Resume the interrupted tour for this user. */
  resumeTour: () => Promise<void>;
  /** Resume the in-progress tour after a route change. */
  resumeCurrent: () => void;
  next: () => void;
  previous: () => void;
  complete: () => void;
  skip: () => void;
  /** Fire a business-action event (used by mutations for reactive steps). */
  notifyAction: (action: string) => void;
  /** Whether a given tour has been completed/skipped. */
  hasTour: (name: string) => boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children, profileId }: { children: React.ReactNode; profileId?: string | null }) {
  const [status, setStatus] = useState<TourStatus>("idle");
  const [state, setState] = useState<TourRuntimeState>({
    status: "idle",
    tourName: null,
    currentStep: 0,
    totalSteps: 0,
    waiting: false,
    waitingStep: null,
  });
  const [activeTour, setActiveTour] = useState<TourDef | null>(null);
  const finishedRef = useRef<Set<string>>(new Set());

  // Wire TourManager listeners once.
  useEffect(() => {
    TourManager.setStepListener((idx) => {
      setState((s) => ({ ...s, currentStep: idx }));
    });
    TourManager.setWaitListener((waiting) => {
      setState((s) => ({ ...s, waiting }));
    });
    TourManager.setDoneListener(() => {
      setStatus("completed");
      setState((s) => ({ ...s, status: "completed", waiting: false }));
    });
    TourManager.setSkipListener(() => {
      setStatus("skipped");
      setState((s) => ({ ...s, status: "skipped", waiting: false }));
    });
    TourManager.setAdvanceListener((tourId, step) => {
      const t = getTour(tourId);
      if (t) void persist(t, step);
    });
  }, []);

  const persist = useCallback(
    async (tour: TourDef, step: number, opts?: { completed?: boolean; skipped?: boolean }) => {
      try {
        const { saveTourProgressAction } = await import(
          "@/server/actions/tour-progress.actions"
        );
        await saveTourProgressAction({
          tourName: tour.id,
          tourVersion: tour.version,
          currentStep: step,
          completed: opts?.completed,
          skipped: opts?.skipped,
        });
      } catch {
        /* persistence is best-effort */
      }
    },
    [],
  );

  const startTour = useCallback(
    async (_name: string, _fromStep = 0) => {
      // Tour temporarily disabled.
      return;
    },
    [],
  );

  const resumeTour = useCallback(async () => {
      // Tour temporarily disabled.
    }, []);

  const next = useCallback(() => TourManager.next(), []);
  const previous = useCallback(() => TourManager.previous(), []);
  const skip = useCallback(() => TourManager.skip(), []);
  const resumeCurrent = useCallback(() => {
      // Tour temporarily disabled.
    }, []);

  const complete = useCallback(() => {
    if (activeTour) {
      persist(activeTour, activeTour.steps.length, { completed: true });
      finishedRef.current.add(activeTour.id);
      // Mark onboarding complete so the user is fully operational.
      if (profileId) {
        import("@/server/actions/welcome.actions").then(
          (mod) => mod.completeOnboardingAction(profileId),
        );
      }
    }
    TourManager.complete();
  }, [activeTour, persist, profileId]);

  const notifyAction = useCallback((action: string) => {
    TourManager.notifyAction(action);
  }, []);

  const hasTour = useCallback(
    (name: string) => finishedRef.current.has(name),
    [],
  );

  const value: TourContextValue = {
    status,
    state,
    activeTour,
    startTour,
    resumeTour,
    next,
    previous,
    complete,
    skip,
    resumeCurrent,
    notifyAction,
    hasTour,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    // Safe no-op fallback when used outside the provider.
    return {
      status: "idle",
      state: {
        status: "idle",
        tourName: null,
        currentStep: 0,
        totalSteps: 0,
        waiting: false,
        waitingStep: null,
      },
      activeTour: null,
      startTour: async () => {},
      resumeTour: async () => {},
      next: () => {},
      previous: () => {},
      complete: () => {},
      skip: () => {},
      resumeCurrent: () => {},
      notifyAction: () => {},
      hasTour: () => false,
    };
  }
  return ctx;
}
