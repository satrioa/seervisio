"use client";

import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface ReplayTourButtonProps {
  missionId: string;
}

export function ReplayTourButton({ missionId }: ReplayTourButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => (window as any).__onboardingStart?.()}
      className="gap-1.5"
    >
      <Play className="size-3.5" />
      Mulai Tour
    </Button>
  );
}
