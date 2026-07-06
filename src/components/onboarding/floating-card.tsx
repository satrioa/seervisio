import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TourStep, Mission } from '@/types/tour';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FloatingCardProps {
  step: TourStep
  mission: Mission
  currentStepIndex: number
  totalSteps: number
  completedPercent: number
  missionIndex: number
  totalMissions: number
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onClose: () => void
  onAskAI?: (prompt: string) => void
  visible: boolean
}

export function FloatingCard({
  step,
  mission,
  currentStepIndex,
  totalSteps,
  completedPercent,
  missionIndex,
  totalMissions,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onAskAI,
  visible
}: FloatingCardProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!targetRect) {
      setPosition({
        top: 80,
        left: Math.max(16, window.innerWidth - 376),
      });
      return;
    }

    const cardWidth = 360;
    const gap = 16;
    let left = targetRect.left;
    const rightEdge = left + cardWidth + 16;
    if (rightEdge > window.innerWidth) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) left = 16;

    setPosition({
      top: Math.min(targetRect.bottom + gap, window.innerHeight - 200),
      left,
    });
  }, [targetRect]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9999,
            width: '360px'
          }}
          layout
        >
          <Card className="backdrop-blur-xl bg-white/95 dark:bg-gray-950/95 border border-white/20 dark:border-gray-800/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Mission {missionIndex + 1} of {totalMissions}
                  </div>
                  <CardTitle className="text-lg mt-1">{mission.title}</CardTitle>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(completedPercent)}%</span>
                </div>
                <Progress value={completedPercent} className="h-1.5" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-2 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onPrev} disabled={currentStepIndex === 0}>
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={onNext}>
                  <ChevronRight size={16} />
                </Button>
              </div>
              <div className="flex gap-2">
                {onAskAI && (
                    <Button variant="outline" size="sm" onClick={() => onAskAI(mission.aiPrompt || "")}>
                        <Sparkles size={14} className="mr-1.5"/>
                        Ask AI
                    </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
                    Skip
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
