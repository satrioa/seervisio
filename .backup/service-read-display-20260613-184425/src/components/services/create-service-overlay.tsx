"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { CreateServiceStepper } from "@/components/services/create-service-stepper";
import { CreateServiceForm, type CreateServiceFormData } from "@/components/services/create-service-form";

const initialFormData: CreateServiceFormData = {
  customerId: undefined,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  estimatedCost: "",
  dpEnabled: false,
  dpAmount: "",
  dpMethodId: "",
  dpAccountId: "",
  dpNote: "",
  deviceType: "",
  deviceBrand: "",
  deviceModel: "",
  serialNumber: "",
  issue: "",
  additionalNotes: "",
  branch: "",
};

interface CreateServiceOverlayProps {
  onSuccess?: () => void;
}

export function CreateServiceOverlay({ onSuccess }: CreateServiceOverlayProps) {
  const { isCreateServiceOpen, closeCreateService } = useRightSidebar();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState<CreateServiceFormData>(initialFormData);

  React.useEffect(() => {
    if (isCreateServiceOpen) {
      setCurrentStep(1);
      setFormData(initialFormData);
    }
  }, [isCreateServiceOpen]);

  const handleClose = React.useCallback(() => {
    closeCreateService();
  }, [closeCreateService]);

  if (!isCreateServiceOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-2 md:p-4">
      <div className="relative flex min-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl md:min-h-0 md:h-[85vh]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 z-10 flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          aria-label="Tutup form buat servis"
        >
          <X className="size-4" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[0.9fr_1.1fr] md:gap-0">
          <div className="flex flex-col justify-center gap-4 border-b bg-muted/30 px-6 py-8 md:border-b-0 md:border-r md:px-10 md:py-12 lg:px-14">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Buat Servis Baru
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Catat data pelanggan, perangkat, keluhan, dan cabang servis dalam satu alur.
              </p>
            </div>

            <div className="mt-2">
              <CreateServiceStepper currentStep={currentStep} />
            </div>

            <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="size-1.5 rounded-full bg-primary/60" />
                Data tersimpan ke timeline servis
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="size-1.5 rounded-full bg-primary/60" />
                Status awal otomatis Masuk
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="size-1.5 rounded-full bg-primary/60" />
                Bisa dilanjutkan ke diagnosa
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden px-6 py-8 md:px-10 md:py-12 lg:px-14">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                Langkah {currentStep}/4
              </span>
              <span className="text-xs text-muted-foreground">
                {currentStep === 1 && "Data Pelanggan"}
                {currentStep === 2 && "Data Perangkat"}
                {currentStep === 3 && "Keluhan"}
                {currentStep === 4 && "Biaya & Konfirmasi"}
              </span>
            </div>

            <div className="flex min-h-0 flex-1">
              <CreateServiceForm
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                formData={formData}
                onFormChange={setFormData}
                onSuccess={onSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
