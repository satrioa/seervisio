"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ServiceSparepartSection } from "@/components/services/service-sparepart-section";
import type { ServiceRecord } from "@/components/services/service-data";

interface ServiceSparepartPanelProps {
  service: ServiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSparepartAdded?: () => void;
  brandSlug: string;
}

export function ServiceSparepartPanel({
  service,
  open,
  onOpenChange,
  onSparepartAdded,
  brandSlug,
}: ServiceSparepartPanelProps) {
  if (!service) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md"
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2 text-base">
            Sparepart Servis
          </SheetTitle>
          <SheetDescription className="text-xs">
            {service.customerName} — {service.deviceBrand} {service.deviceModel} ({service.serviceNumber || service.id.slice(0, 8)})
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          <ServiceSparepartSection
            serviceId={service.id}
            serviceNumber={service.serviceNumber || service.id}
            branchId={service.branchId}
            spareparts={service.spareparts}
            currentStatus={service.status}
            onSparepartAdded={onSparepartAdded}
            brandSlug={brandSlug}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
