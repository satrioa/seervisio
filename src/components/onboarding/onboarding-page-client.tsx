"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "./onboarding-checklist";
import { CompletionCard } from "./completion-card";
import { GuidedTour } from "./guided-tour";
import {
  getOnboardingProgressAction,
  completeOnboardingTaskAction,
  completeOnboardingAction,
  restartOnboardingAction,
} from "@/server/actions/onboarding.actions";

interface OnboardingPageClientProps {
  profileId: string;
  role: string;
  brandSlug: string;
  userName: string;
  initialCompleted: boolean;
  initialCompletedTasks: string[];
}

export function OnboardingPageClient({
  profileId,
  role,
  brandSlug,
  userName,
  initialCompleted,
  initialCompletedTasks,
}: OnboardingPageClientProps) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [completedTasks, setCompletedTasks] = React.useState(initialCompletedTasks);
  const [tourRunning, setTourRunning] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const refreshProgress = async () => {
    const result = await getOnboardingProgressAction();
    if (result.success) {
      setCompleted(result.data.onboarding_completed as boolean);
      setCompletedTasks(result.data.onboarding_completed_tasks as string[]);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (completedTasks.includes(taskId)) return;
    await completeOnboardingTaskAction(taskId);
    setCompletedTasks((prev) => [...prev, taskId]);
  };

  const handleTourFinish = async () => {
    setTourRunning(false);
    await completeOnboardingAction();
    setCompleted(true);
  };

  const handleTourSkip = () => {
    setTourRunning(false);
  };

  const handleRestart = async () => {
    setRefreshing(true);
    await restartOnboardingAction();
    setCompleted(false);
    setCompletedTasks([]);
    setRefreshing(false);
    setTourRunning(true);
  };

  if (completed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <CompletionCard
            userName={userName}
            onGoToDashboard={() => router.push(`/${brandSlug}/panel/dashboard`)}
          />
          <div className="mt-6 text-center">
            <button
              type="button"
              disabled={refreshing}
              onClick={handleRestart}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className="size-3" />
              Ulangi Orientasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {tourRunning && (
        <GuidedTour
          role={role}
          brandSlug={brandSlug}
          run={tourRunning}
          onFinish={handleTourFinish}
          onSkip={handleTourSkip}
        />
      )}

      <div className="mx-auto max-w-2xl p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5">
            <Sparkles className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Selamat Datang, {userName}! 🎉
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mari kita kenali Seervisio bersama. Selesaikan tugas orientasi
            untuk memulai perjalanan Anda.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex justify-center gap-3"
        >
          <Button
            onClick={() => setTourRunning(true)}
            className="gap-2 rounded-xl"
            size="lg"
          >
            <Play className="size-4" />
            Mulai Tur Interaktif
          </Button>
        </motion.div>

        {/* Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <OnboardingChecklist
            role={role}
            completedTasks={completedTasks}
            onCompleteTask={handleCompleteTask}
          />
        </motion.div>
      </div>
    </>
  );
}
