"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { ServiceRecord } from "@/components/services/service-data";
import { ServiceDetailContent } from "@/components/services/service-detail-content";

interface ServiceDetailModalProps {
  service: ServiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug?: string;
  onServiceUpdated?: () => void;
  role?: string;
}

export function ServiceDetailModal({
  service,
  open,
  onOpenChange,
  brandSlug,
  onServiceUpdated,
  role,
}: ServiceDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden p-0 flex flex-col lg:max-w-xl">
        <ServiceDetailContent
          service={service}
          onClose={() => onOpenChange(false)}
          brandSlug={brandSlug}
          onServiceUpdated={onServiceUpdated}
          role={role}
        />
      </DialogContent>
    </Dialog>
  );
}
