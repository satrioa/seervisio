"use client";

import * as React from "react";
import {
  getOnboardingProgressAction,
  completeOnboardingTaskAction,
  restartOnboardingAction,
} from "@/server/actions/onboarding.actions";
import { GuidedTour } from "./guided-tour";

interface TourProviderProps {
  profileId: string;
  role: string;
  brandSlug: string;
  children: React.ReactNode;
  onboardingCompleted: boolean;
  initialTasks: string[];
}

interface TourContextValue {
  onboardingCompleted: boolean;
  completedTasks: string[];
  refreshProgress: () => Promise<void>;
  startTour: () => void;
  restartTour: () => Promise<void>;
}

const TourContext = React.createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = React.useContext(TourContext);
  if (!ctx) {
    return {
      onboardingCompleted: true,
      completedTasks: [] as string[],
      refreshProgress: async () => {},
      startTour: () => {},
      restartTour: async () => {},
    };
  }
  return ctx;
}

export function TourProvider({
  profileId,
  role,
  brandSlug,
  children,
  onboardingCompleted: initialCompleted,
  initialTasks,
}: TourProviderProps) {
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [completedTasks, setCompletedTasks] = React.useState(initialTasks);
  const [tourRunning, setTourRunning] = React.useState(false);

  const refreshProgress = React.useCallback(async () => {
    const result = await getOnboardingProgressAction();
    if (result.success) {
      setCompleted(result.data.onboarding_completed);
      setCompletedTasks(result.data.onboarding_completed_tasks);
    }
  }, []);

  const startTour = React.useCallback(() => {
    setTourRunning(true);
  }, []);

  const restartTour = React.useCallback(async () => {
    await restartOnboardingAction();
    setCompleted(false);
    setCompletedTasks([]);
    setTourRunning(true);
  }, []);

  const value = React.useMemo<TourContextValue>(
    () => ({
      onboardingCompleted: completed,
      completedTasks,
      refreshProgress,
      startTour,
      restartTour,
    }),
    [completed, completedTasks, refreshProgress, startTour, restartTour]
  );

  return (
    <TourContext.Provider value={value}>
      {tourRunning && (
        <GuidedTour
          role={role}
          brandSlug={brandSlug}
          run={tourRunning}
          onFinish={() => {
            setTourRunning(false);
            setCompleted(true);
            refreshProgress();
          }}
          onSkip={() => setTourRunning(false)}
        />
      )}
      {children}
    </TourContext.Provider>
  );
}
