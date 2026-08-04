"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ServiceDetailContent } from "@/components/services/service-detail-content";
import type { ServiceRecord } from "@/components/services/service-data";
import { getServiceDetailAction } from "@/server/actions/service.actions";

interface ServiceDetailSheetProps {
  service: ServiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  brandSlug: string;
  onServiceUpdated?: () => void;
  role?: string;
}

export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
  loading = false,
  brandSlug,
  onServiceUpdated,
  role,
}: ServiceDetailSheetProps) {
  console.log("[TRACE:ServiceDetailSheet] received service timeline length:", service?.timeline?.length ?? 0, "for", service?.id);
  const [enrichedService, setEnrichedService] = React.useState<ServiceRecord | null>(null);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && (window as any).__radixDialogOpen) {
        return;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  React.useEffect(() => {
    if (!service || !brandSlug || !open) {
      setEnrichedService(null);
      return;
    }
    const hasTimeline = service.timeline && service.timeline.length > 0;
    if (hasTimeline) {
      setEnrichedService(null);
      return;
    }
    getServiceDetailAction(brandSlug, service.id).then((result) => {
      if (result.success) {
        console.log("[TRACE:ServiceDetailSheet] enriched with timeline length:", result.data.timeline.length, "for", service.id);
        setEnrichedService(result.data);
      }
    });
  }, [service, brandSlug, open]);

  const displayService = enrichedService ?? service;

  const title =
    displayService && displayService.customerName
      ? `${displayService.serviceNumber || displayService.id} — ${displayService.customerName}`
      : "Detail Servis";

  const description =
    displayService
      ? `${displayService.deviceName} • ${displayService.statusLabel}`
      : "";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-lg lg:max-w-xl [&>button.absolute]:hidden"
        closeOnOutsideClick={false}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {loading && !displayService ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <ServiceDetailContent
            service={displayService}
            onClose={() => handleOpenChange(false)}
            brandSlug={brandSlug}
            onServiceUpdated={onServiceUpdated}
            role={role}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
