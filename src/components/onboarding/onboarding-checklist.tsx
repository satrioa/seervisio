"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { TOUR_TASKS, SECTION_ICONS } from "./onboarding-types";
import { ProgressRing } from "./progress-ring";

interface OnboardingChecklistProps {
  role: string;
  completedTasks: string[];
  onCompleteTask?: (taskId: string) => void;
}

export function OnboardingChecklist({
  role,
  completedTasks,
  onCompleteTask,
}: OnboardingChecklistProps) {
  const tasks = TOUR_TASKS[role] ?? [];
  const total = tasks.length;
  const done = completedTasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  // Group by section
  const sections = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
    if (!acc[task.section]) acc[task.section] = [];
    acc[task.section].push(task);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress header */}
      <div className="mb-8 text-center">
        <ProgressRing progress={progress} size={140} strokeWidth={10} />
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          Progres Orientasi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {done} dari {total} tugas selesai
        </p>
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {Object.entries(sections).map(([sectionName, sectionTasks]) => (
          <div key={sectionName}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span>{SECTION_ICONS[sectionName] ?? "📌"}</span>
              {sectionName}
            </h3>
            <div className="space-y-2">
              {sectionTasks.map((task, i) => {
                const isDone = completedTasks.includes(task.id);
                return (
                  <motion.button
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => onCompleteTask?.(task.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      isDone
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : "border-2 border-muted-foreground/30"
                      }`}
                    >
                      {isDone ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Circle className="size-2.5 text-muted-foreground/30" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          isDone ? "text-primary line-through opacity-70" : "text-foreground"
                        }`}
                      >
                        {task.label}
                      </p>
                      {!isDone && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
        >
          <p className="text-lg font-semibold text-primary">
            🎉 Selamat! Semua tugas selesai
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Anda sudah siap menggunakan Seervisio. Buka menu lain untuk memulai!
          </p>
        </motion.div>
      )}
    </div>
  );
}
