"use client";

import * as React from "react";
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData, type Step } from "react-joyride";
import { TourTooltip } from "./tour-tooltip";
import { getTourSteps } from "./role-tour-factory";
import { updateOnboardingStepAction, completeOnboardingAction } from "@/server/actions/onboarding.actions";

interface GuidedTourProps {
  role: string;
  brandSlug: string;
  run: boolean;
  onFinish: () => void;
  onSkip: () => void;
}

export function GuidedTour({ role, brandSlug, run, onFinish, onSkip }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const steps = React.useMemo(() => getTourSteps(role, brandSlug) as Step[], [role, brandSlug]);

  const handleEvent = (data: EventData) => {
    const { action, index, type } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
      updateOnboardingStepAction(nextIndex);
    }

    if (type === EVENTS.TOUR_END) {
      const status = (data as any).status;
      if (status === STATUS.FINISHED) {
        completeOnboardingAction().then(onFinish);
      } else if (status === STATUS.SKIPPED) {
        onSkip();
      }
    }
  };

  React.useEffect(() => {
    if (run) setStepIndex(0);
  }, [run]);

  return (
    <Joyride
      continuous
      onEvent={handleEvent}
      options={{
        overlayClickAction: false,
        spotlightPadding: 8,
        scrollOffset: 100,
        buttons: ["back", "close", "primary", "skip"],
      }}
      run={run}
      scrollToFirstStep
      stepIndex={stepIndex}
      steps={steps}
      tooltipComponent={TourTooltip as any}
    />
  );
}
