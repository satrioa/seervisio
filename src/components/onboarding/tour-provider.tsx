"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { TourState, TourStatus, Mission, TourConfig } from "@/types/tour";
import { getTourConfig } from "@/lib/tour/registry";
import { loadTourStateAction, saveTourStateAction } from "@/server/actions/tour.actions";
import { useUserSession } from "@/hooks/useUserSession";
import { TourEngine } from "./tour-engine";
import { WelcomeScreen } from "./welcome-screen";

export interface TourContextValue {
  tourStatus: TourStatus;
  tourState: TourState;
  tourConfig: TourConfig | null;
  activeMission: Mission | null;
  startTour: () => void;
  startMission: (missionId: string) => void;
  skipTour: () => void;
  closeTour: () => void;
  resumeTour: () => void;
  restartTour: () => void;
  completeMission: (missionId: string) => void;
  completedMissions: string[];
}

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

const DEFAULT_TOUR_STATE: TourState = {
  tour_version: 1,
  completed_at: null,
  skipped_at: null,
  last_step: 0,
  last_mission: null,
  completed_missions: [],
  dismissed_missions: [],
};

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { user, role, loading: sessionLoading } = useUserSession();

  const [tourStatus, setTourStatus] = useState<TourStatus>("idle");
  const [tourState, setTourState] = useState<TourState | null>(null);
  const [tourConfig, setTourConfig] = useState<TourConfig | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  useEffect(() => {
    if (!user?.id || sessionLoading) return;

    loadTourStateAction(user.id).then((state) => {
      setTourState(state);

      if (state.completed_at) {
        setTourStatus("completed");
      } else if (state.skipped_at) {
        setTourStatus("skipped");
      } else if (state.last_step > 0) {
        setTourStatus("paused");
      } else {
        setTourStatus("idle");
      }
    });

    setTourConfig(getTourConfig(brandSlug, role));
  }, [user?.id, role, brandSlug, sessionLoading]);

  const updateState = useCallback(async (newState: Partial<TourState>) => {
    if (!tourState || !user?.id) return;
    const updated = { ...tourState, ...newState };
    setTourState(updated);
    await saveTourStateAction(user.id, updated);
  }, [tourState, user?.id]);

  const startTour = useCallback(() => {
    setTourStatus("welcome");
  }, []);

  const resumeTour = useCallback(() => {
    setTourStatus("touring");
    if (tourState?.last_mission && tourConfig) {
      const mission = tourConfig.missions.find((m) => m.id === tourState.last_mission);
      if (mission) setActiveMission(mission);
    }
  }, [tourState, tourConfig]);

  const startMission = useCallback((missionId: string) => {
    if (!tourConfig) return;
    const mission = tourConfig.missions.find((m) => m.id === missionId);
    if (mission) {
      setActiveMission(mission);
      setTourStatus("touring");
    }
  }, [tourConfig]);

  const skipTour = useCallback(async () => {
    setTourStatus("skipped");
    setActiveMission(null);
    await updateState({ skipped_at: new Date().toISOString() });
  }, [updateState]);

  const closeTour = useCallback(async () => {
    setTourStatus("idle");
    setActiveMission(null);
    if (tourState) {
      await updateState({ last_step: tourState.last_step, last_mission: tourState.last_mission });
    }
  }, [tourState, updateState]);

  const restartTour = useCallback(() => {
    setTourStatus("welcome");
    setActiveMission(null);
    if (user?.id) {
      saveTourStateAction(user.id, {
        tour_version: 1,
        completed_at: null,
        skipped_at: null,
        last_step: 0,
        last_mission: null,
        completed_missions: [],
        dismissed_missions: [],
      });
    }
  }, [user?.id]);

  const completeMission = useCallback(async (missionId: string) => {
    if (!tourState || !user?.id || !tourConfig) return;
    const completed = [...(tourState.completed_missions || []), missionId];
    const updated = { ...tourState, completed_missions: completed };
    setTourState(updated);
    await saveTourStateAction(user.id, updated);

    const allDone = tourConfig.missions.every((m) => completed.includes(m.id));
    if (allDone) {
      setTourStatus("completed");
      const finalState = { ...updated, completed_at: new Date().toISOString() };
      setTourState(finalState);
      await saveTourStateAction(user.id, finalState);
    }

    setActiveMission(null);
  }, [tourState, user?.id, tourConfig]);

  const handleWelcomeStart = useCallback(() => {
    if (!tourConfig) return;
    const firstMission = tourConfig.missions[0];
    if (firstMission) setActiveMission(firstMission);
    setTourStatus("touring");
  }, [tourConfig]);

  const resolvedTourState = tourState ?? DEFAULT_TOUR_STATE;

  const value = useMemo<TourContextValue>(() => ({
    tourStatus,
    tourState: resolvedTourState,
    tourConfig,
    activeMission,
    startTour,
    startMission,
    skipTour,
    closeTour,
    resumeTour,
    restartTour,
    completeMission,
    completedMissions: resolvedTourState.completed_missions,
  }), [
    tourStatus, resolvedTourState, tourConfig, activeMission,
    startTour, startMission, skipTour, closeTour, resumeTour, completeMission,
  ]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {tourStatus === 'welcome' && tourConfig && (
        <WelcomeScreen
          open
          onStart={handleWelcomeStart}
          onSkip={skipTour}
          missionsCount={tourConfig.missions.length}
          role={role}
        />
      )}
      {tourStatus === 'touring' && activeMission && tourConfig && (
        <TourEngine
          missions={tourConfig.missions}
          onComplete={() => completeMission(activeMission.id)}
          onSkip={skipTour}
          onClose={closeTour}
        />
      )}
    </TourContext.Provider>
  );
}