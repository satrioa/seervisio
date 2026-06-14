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

/* ─── Props ─── */

interface ServiceDetailSheetProps {
  service: ServiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  brandSlug: string;
  onServiceUpdated?: () => void;
  role?: string;
}

/* ─── Component ─── */

export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
  loading = false,
  brandSlug,
  onServiceUpdated,
  role,
}: ServiceDetailSheetProps) {
  const title =
    service && service.customerName
      ? `${service.serviceNumber || service.id} — ${service.customerName}`
      : "Detail Servis";

  const description =
    service
      ? `${service.deviceName} • ${service.statusLabel}`
      : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-xl lg:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {loading && !service ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <ServiceDetailContent
            service={service}
            onClose={() => onOpenChange(false)}
            brandSlug={brandSlug}
            onServiceUpdated={onServiceUpdated}
            role={role}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
