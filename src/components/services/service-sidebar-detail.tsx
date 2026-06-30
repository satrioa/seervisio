"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import type { ServiceRecord } from "@/components/services/service-data";
import { ServiceDetailContent } from "@/components/services/service-detail-content";
import { getSessionRoleAction } from "@/server/actions/service.actions";

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
  const params = useParams();
  const brandSlug = brandSlugProp ?? (params?.brandSlug as string) ?? "";
  const { showOverview } = useRightSidebar();
  const [resolvedRole, setResolvedRole] = React.useState<string | undefined>(role);
  const [hideStatusSteps, setHideStatusSteps] = React.useState(false);

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
    const mode = localStorage.getItem("seervis:services:view-mode");
    setHideStatusSteps(mode === "list");
  }, []);

  return (
    <ServiceDetailContent
      service={service}
      onClose={showOverview}
      brandSlug={brandSlug}
      onServiceUpdated={onServiceUpdated}
      role={resolvedRole}
      hideStatusSteps={hideStatusSteps}
    />
  );
}
