"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

interface EmptyStateCTAProps {
  missionId: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  onStartTour?: () => void;
}

export function EmptyStateCTA({
  missionId: _missionId,
  title,
  description,
  actionLabel,
  onAction,
  onStartTour,
}: EmptyStateCTAProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted-foreground/10">
        <GraduationCap className="size-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onAction}>{actionLabel}</Button>
        {onStartTour && (
          <Button variant="outline" onClick={onStartTour}>
            Mulai Tour
          </Button>
        )}
      </div>
    </div>
  );
}
