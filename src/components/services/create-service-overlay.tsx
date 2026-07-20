"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { CreateServiceStepper } from "@/components/services/create-service-stepper";
import { CreateServiceForm, type CreateServiceFormData } from "@/components/services/create-service-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  assignedTechnicianId: "",
};

interface CreateServiceOverlayProps {
  onSuccess?: () => void | Promise<void>;
}

function hasFormChanges(data: CreateServiceFormData): boolean {
  return (
    data.customerName !== "" ||
    data.customerPhone !== "" ||
    data.customerAddress !== "" ||
    data.estimatedCost !== "" ||
    data.dpEnabled ||
    data.dpAmount !== "" ||
    data.deviceType !== "" ||
    data.deviceBrand !== "" ||
    data.deviceModel !== "" ||
    data.serialNumber !== "" ||
    data.issue !== "" ||
    data.additionalNotes !== "" ||
    data.branch !== "" ||
    data.assignedTechnicianId !== ""
  );
}

export function CreateServiceOverlay({ onSuccess }: CreateServiceOverlayProps) {
  const { isCreateServiceOpen, closeCreateService } = useRightSidebar();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState<CreateServiceFormData>(initialFormData);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const isSmallScreen = useMediaQuery("(max-width: 768px)");

  React.useEffect(() => {
    if (isCreateServiceOpen) {
      setCurrentStep(1);
      setFormData(initialFormData);
      setConfirmOpen(false);
    }
  }, [isCreateServiceOpen]);

  const handleClose = React.useCallback(() => {
    if (hasFormChanges(formData)) {
      setConfirmOpen(true);
      return;
    }
    closeCreateService();
  }, [formData, closeCreateService]);

  React.useEffect(() => {
    if (!isCreateServiceOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmOpen) handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateServiceOpen, handleClose, confirmOpen]);

  if (!isCreateServiceOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-2 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative flex min-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl md:min-h-0 md:h-[85vh]">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full"
          aria-label="Tutup form buat servis"
        >
          <X className="size-4" />
        </Button>

        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[0.9fr_1.1fr] md:gap-0">
          <div className="flex flex-col justify-center gap-4 border-b bg-muted/30 px-5 py-6 md:border-b-0 md:border-r md:px-10 md:py-12 lg:px-14">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Buat Servis Baru
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Catat data pelanggan, perangkat, keluhan, dan cabang servis dalam satu alur.
              </p>
            </div>

            <div className="mt-1 md:mt-2">
              <CreateServiceStepper
                currentStep={currentStep}
                variant={isSmallScreen ? "horizontal" : "vertical"}
              />
            </div>

            <div className="mt-2 hidden flex-col gap-2 rounded-lg border border-border/50 bg-background/50 p-3 md:flex">
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

          <div className="flex min-h-0 flex-col overflow-hidden px-5 py-6 md:px-10 md:py-12 lg:px-14">
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[92%] max-w-sm rounded-2xl border border-border bg-card p-0 shadow-2xl">
          <div className="flex flex-col items-center gap-3 px-6 pt-7 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">
                Batalkan pengisian form?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Ada perubahan yang belum disimpan. Jika ditutup, data yang sudah diisi akan hilang.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 px-6 pb-6 pt-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setConfirmOpen(false)}
            >
              Lanjut Isi
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => {
                setConfirmOpen(false);
                closeCreateService();
              }}
            >
              Ya, Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>,
    document.body
  );
}
