"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import type { ServiceRecord } from "@/components/services/service-data";
import { ServiceDetailContent } from "@/components/services/service-detail-content";
import { getSessionRoleAction, getServiceDetailAction } from "@/server/actions/service.actions";

interface ServiceSidebarDetailProps {
  service: ServiceRecord;
  brandSlug?: string;
  onServiceUpdated?: () => void;
  role?: string;
}

export function ServiceSidebarDetail({
  service,
  brandSlug: brandSlugProp,
  onServiceUpdated,
  role,
}: ServiceSidebarDetailProps) {
  console.log("[TRACE:ServiceSidebarDetail] received service timeline length:", service.timeline?.length ?? 0, "for", service.id);
  const params = useParams();
  const brandSlug = brandSlugProp ?? (params?.brandSlug as string) ?? "";
  const { showOverview } = useRightSidebar();
  const [resolvedRole, setResolvedRole] = React.useState<string | undefined>(role);
  const [enrichedService, setEnrichedService] = React.useState<ServiceRecord | null>(null);

  React.useEffect(() => {
    if (role || !brandSlug) {
      setResolvedRole(role);
      return;
    }
    getSessionRoleAction(brandSlug).then((result) => {
      if (result.success) setResolvedRole(result.data.role);
    });
  }, [role, brandSlug]);

  React.useEffect(() => {
    const hasTimeline = service.timeline && service.timeline.length > 0;
    if (hasTimeline) {
      setEnrichedService(null);
      return;
    }
    getServiceDetailAction(brandSlug, service.id).then((result) => {
      if (result.success) {
        console.log("[TRACE:ServiceSidebarDetail] enriched with timeline length:", result.data.timeline.length, "for", service.id);
        setEnrichedService(result.data);
      }
    });
  }, [service, brandSlug]);

  const displayService = enrichedService ?? service;

  return (
    <ServiceDetailContent
      service={displayService}
      onClose={showOverview}
      brandSlug={brandSlug}
      onServiceUpdated={onServiceUpdated}
      role={resolvedRole}
    />
  );
}
