"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";

interface OnboardingChecklistProps {
  className?: string;
}

export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const { isActive, completedSteps, totalSteps, startOnboarding } = useOnboarding();
  const [collapsed, setCollapsed] = React.useState(false);

  if (isActive) return null;

  const meaningfulSteps = totalSteps;
  const doneCount = completedSteps.length;
  const progress = meaningfulSteps > 0 ? Math.round((doneCount / meaningfulSteps) * 100) : 0;

  if (progress >= 100) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Setup Progress</h3>
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-1 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              (window as any).__onboardingStart?.();
              startOnboarding();
            }}
          >
            Lanjutkan Setup
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
