import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mission, TourStep } from '@/types/tour';
import { Spotlight } from './spotlight';
import { FloatingCard } from './floating-card';

interface TourEngineProps {
  missions: Mission[];
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function TourEngine({ missions, onComplete, onSkip, onClose }: TourEngineProps) {
  const router = useRouter();
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);

  const activeMission = missions[currentMissionIndex];
  const activeStep = activeMission?.steps[currentStepIndex];

  const waitForElement = useCallback((selector: string, timeout = 5000): Promise<Element | null> => {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) return resolve(element);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }, []);

  const updateTarget = useCallback(async () => {
    if (!activeStep?.selector) {
      setTargetRect(null);
      return;
    }

    if (activeStep.route && window.location.pathname !== activeStep.route) {
        if (activeStep.autoNavigate) {
            router.push(activeStep.route);
        }
        return;
    }

    const element = await waitForElement(activeStep.selector);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [activeStep, router, waitForElement]);

  useEffect(() => {
    updateTarget();
  }, [updateTarget, currentMissionIndex, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < activeMission.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else if (currentMissionIndex < missions.length - 1) {
      setCurrentMissionIndex(prev => prev + 1);
      setCurrentStepIndex(0);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else if (currentMissionIndex > 0) {
      setCurrentMissionIndex(prev => prev - 1);
      setCurrentStepIndex(missions[currentMissionIndex - 1].steps.length - 1);
    }
  };

  const completedSteps = missions.slice(0, currentMissionIndex).reduce((acc, m) => acc + m.steps.length, 0) + currentStepIndex;
  const totalSteps = missions.reduce((acc, m) => acc + m.steps.length, 0);
  const completedPercent = (completedSteps / totalSteps) * 100;

  if (!activeMission || !activeStep) return null;

  return (
    <>
      <Spotlight
        targetRect={targetRect}
        visible={visible}
        padding={activeStep.spotlightPadding || 8}
      />
      <FloatingCard
        step={activeStep}
        mission={activeMission}
        currentStepIndex={currentStepIndex}
        totalSteps={activeMission.steps.length}
        completedPercent={completedPercent}
        missionIndex={currentMissionIndex}
        totalMissions={missions.length}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={onSkip}
        onClose={onClose}
        visible={visible}
      />
    </>
  );
}
