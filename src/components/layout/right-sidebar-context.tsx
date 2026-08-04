"use client";

import * as React from "react";
import type { ServiceRecord } from "@/components/services/service-data";

type SidebarType = "overview" | "detail";

interface RightSidebarContextValue {
  type: SidebarType;
  data: ServiceRecord | null;
  showOverview: () => void;
  showDetail: (service: ServiceRecord) => void;
  isCreateServiceOpen: boolean;
  openCreateService: (e?: React.MouseEvent<HTMLElement>) => void;
  closeCreateService: () => void;
  onServiceUpdated?: () => void;
  setOnServiceUpdated: (cb: (() => void) | undefined) => void;
}

const RightSidebarContext = React.createContext<RightSidebarContextValue | undefined>(undefined);

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = React.useState<SidebarType>("overview");
  const [data, setData] = React.useState<ServiceRecord | null>(null);
  const [isCreateServiceOpen, setIsCreateServiceOpen] = React.useState(false);
  const [onServiceUpdated, setOnServiceUpdatedState] = React.useState<(() => void) | undefined>(undefined);

  const showOverview = React.useCallback(() => {
    setType("overview");
    setData(null);
  }, []);

  const showDetail = React.useCallback((service: ServiceRecord) => {
    console.log("[TRACE:RightSidebarContext] showDetail called with timeline length:", service.timeline?.length ?? 0, "for", service.id);
    setData(service);
    setType("detail");
  }, []);

  const openCreateService = React.useCallback((
    e?: React.MouseEvent<HTMLElement>,
  ) => {
    // Reject programmatic clicks (isTrusted=false from trigger.click())
    // to prevent the tour's openDialogIfNeeded from auto-opening the form.
    if (!e?.nativeEvent?.isTrusted) return;
    setIsCreateServiceOpen(true);
  }, []);

  const closeCreateService = React.useCallback(() => {
    setIsCreateServiceOpen(false);
  }, []);

  const setOnServiceUpdated = React.useCallback((cb: (() => void) | undefined) => {
    setOnServiceUpdatedState(() => cb);
  }, []);

  return (
    <RightSidebarContext.Provider
      value={{
        type,
        data,
        showOverview,
        showDetail,
        isCreateServiceOpen,
        openCreateService,
        closeCreateService,
        onServiceUpdated,
        setOnServiceUpdated,
      }}
    >
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const ctx = React.useContext(RightSidebarContext);
  if (!ctx) throw new Error("useRightSidebar must be used within RightSidebarProvider");
  return ctx;
}
