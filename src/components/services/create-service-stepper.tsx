"use client";

import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  label: string;
  description: string;
}

export const CREATE_SERVICE_STEPS: Step[] = [
  {
    id: 1,
    label: "Data Pelanggan",
    description: "Nama, nomor telepon, dan alamat pelanggan.",
  },
  {
    id: 2,
    label: "Data Perangkat",
    description: "Tipe, merk, model, dan serial number.",
  },
  {
    id: 3,
    label: "Keluhan",
    description: "Catatan kerusakan atau masalah perangkat.",
  },
  {
    id: 4,
    label: "Biaya & Konfirmasi",
    description: "Pilih cabang dan cek ulang data servis.",
  },
];

interface CreateServiceStepperProps {
  currentStep: number;
}

export function CreateServiceStepper({ currentStep }: CreateServiceStepperProps) {
  return (
    <div className="flex flex-col gap-1">
      {CREATE_SERVICE_STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isFuture = currentStep < step.id;

        return (
          <div key={step.id} className="flex gap-4">
            {/* Rail + Circle */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary bg-background text-primary",
                  isFuture && "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span className="text-xs font-semibold">{step.id}</span>
                )}
              </div>
              {/* Rail line (not last) */}
              {index < CREATE_SERVICE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mt-1 h-full min-h-[40px] w-px",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Label + Description */}
            <div className={cn("flex flex-col gap-0.5 pb-8", isFuture && "opacity-50")}>
              <span
                className={cn(
                  "text-sm font-medium",
                  isActive && "text-foreground",
                  isCompleted && "text-foreground",
                  isFuture && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
