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
  variant?: "vertical" | "horizontal";
}

export function CreateServiceStepper({ currentStep, variant = "vertical" }: CreateServiceStepperProps) {
  if (variant === "horizontal") {
    return (
      <div className="flex items-start">
        {CREATE_SERVICE_STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-0.5">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary bg-background text-primary",
                    !isCompleted && !isActive && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="text-[11px] font-semibold">{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight",
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < CREATE_SERVICE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mt-3.5 h-px w-3 shrink-0 sm:w-5",
                    currentStep > step.id ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

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
