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
  openCreateService: () => void;
  closeCreateService: () => void;
}

const RightSidebarContext = React.createContext<RightSidebarContextValue | undefined>(undefined);

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = React.useState<SidebarType>("overview");
  const [data, setData] = React.useState<ServiceRecord | null>(null);
  const [isCreateServiceOpen, setIsCreateServiceOpen] = React.useState(false);

  const showOverview = React.useCallback(() => {
    setType("overview");
    setData(null);
  }, []);

  const showDetail = React.useCallback((service: ServiceRecord) => {
    setData(service);
    setType("detail");
  }, []);

  const openCreateService = React.useCallback(() => {
    setIsCreateServiceOpen(true);
  }, []);

  const closeCreateService = React.useCallback(() => {
    setIsCreateServiceOpen(false);
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
