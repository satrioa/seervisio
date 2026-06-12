"use client";

import * as React from "react";
import { Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Search,
  LayoutList,
  Columns3,
  Filter,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreateServiceOverlay } from "@/components/services/create-service-overlay";

import {
  type ServiceStatus,
  STATUS_CONFIG,
  STATUS_ORDER,
} from "@/components/services/service-data";
import type { ServiceRecord } from "@/components/services/service-data";
import { ServiceListView } from "@/components/services/service-list-view";
import { ServiceKanbanView } from "@/components/services/service-kanban-view";
import { ServiceDetailSheet } from "@/components/services/service-detail-sheet";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { listServicesAction, getServiceDetailAction } from "@/server/actions/service.actions";
import { mapDbStatusToUI } from "@/components/services/service-ui-mappers";

type ViewMode = "list" | "kanban";

const viewTransition = {
  initial: { opacity: 0, y: 8, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.985 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { showDetail } = useRightSidebar();

  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [isMounted, setIsMounted] = React.useState(false);

  // Read persisted preference after mount (hydration safety)
  React.useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("seervis:services:view-mode");
    if (stored === "list" || stored === "kanban") {
      setViewMode(stored);
    }
  }, []);

  // Persist preference on change
  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("seervis:services:view-mode", viewMode);
    }
  }, [viewMode, isMounted]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ServiceStatus | "all">("all");
  const [technicianFilter, setTechnicianFilter] = React.useState("all");
  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [technicianFilterOpen, setTechnicianFilterOpen] = React.useState(false);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [services, setServices] = React.useState<ServiceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedServiceDetail, setSelectedServiceDetail] = React.useState<ServiceRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    listServicesAction({ brandSlug }).then((result) => {
      if (result.success) {
        setServices(result.data);
      }
      setLoading(false);
    });
  }, [brandSlug]);

  // Fetch full service detail when a service is selected
  React.useEffect(() => {
    if (!selectedServiceId) {
      setSelectedServiceDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setIsDetailLoading(true);
      try {
        const result = await getServiceDetailAction(brandSlug, selectedServiceId);
        if (result.success) {
          setSelectedServiceDetail(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch service detail:", err);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchDetail();
  }, [brandSlug, selectedServiceId]);

  const selectedService = React.useMemo(
    () => selectedServiceDetail ?? services.find((s) => s.id === selectedServiceId) ?? null,
    [selectedServiceDetail, selectedServiceId, services]
  );

  const technicians = React.useMemo(
    () =>
      Array.from(
        new Set(services.map((service) => service.technician).filter(Boolean))
      ).sort() as string[],
    [services]
  );

  // Restore right sidebar from URL on mount
  React.useEffect(() => {
    const serviceId = searchParams.get("service");
    if (serviceId && services.length > 0) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        showDetail(service);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  // Filter services
  const filteredServices = React.useMemo(() => {
    let result = services;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (technicianFilter === "unassigned") {
      result = result.filter((s) => !s.technician);
    } else if (technicianFilter !== "all") {
      result = result.filter((s) => s.technician === technicianFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.deviceBrand.toLowerCase().includes(q) ||
          s.deviceModel.toLowerCase().includes(q) ||
          s.issue.toLowerCase().includes(q)
      );
    }

    return result;
  }, [search, statusFilter, technicianFilter, services]);

  const updateUrlParam = React.useCallback(
    (serviceId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (serviceId) {
        params.set("service", serviceId);
      } else {
        params.delete("service");
      }
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleCardDoubleClick = React.useCallback(
    (service: ServiceRecord) => {
      setSelectedServiceId(service.id);
      setIsDetailOpen(true);
      updateUrlParam(service.id);
      showDetail(service);
    },
    [updateUrlParam, showDetail]
  );

  const handleSheetOpenChange = React.useCallback(
    (open: boolean) => {
      setIsDetailOpen(open);
      if (!open) {
        // Clear URL param when sheet closes
        updateUrlParam(null);
      }
    },
    [updateUrlParam]
  );

  const handleServiceUpdated = useCallback(() => {
    listServicesAction({ brandSlug }).then((result) => {
      if (result.success) setServices(result.data);
    });
    if (selectedServiceId) {
      getServiceDetailAction(brandSlug, selectedServiceId).then(result => {
        if (result.success) setSelectedServiceDetail(result.data);
      });
    }
  }, [brandSlug, selectedServiceId]);

  const statusFilterLabel =
    statusFilter === "all" ? "Semua Status" : STATUS_CONFIG[statusFilter].label;
  const technicianFilterLabel =
    technicianFilter === "all"
      ? "Semua Teknisi"
      : technicianFilter === "unassigned"
        ? "Belum Ditugaskan"
        : technicianFilter;

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ---------- Toolbar ---------- */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari servis, pelanggan, perangkat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-[140px] justify-start px-3 text-xs font-normal"
                >
                  <Filter className="mr-1.5 size-3.5 text-muted-foreground" />
                  <span className="truncate">{statusFilterLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="z-[1001] w-[180px] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setStatusFilterOpen(false);
                  }}
                  className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span>Semua Status</span>
                  {statusFilter === "all" && <Check className="size-3.5" />}
                </button>
                {STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setStatusFilterOpen(false);
                    }}
                    className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>{STATUS_CONFIG[status].label}</span>
                    {statusFilter === status && <Check className="size-3.5" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Technician Filter */}
            <Popover
              open={technicianFilterOpen}
              onOpenChange={setTechnicianFilterOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-[150px] justify-start px-3 text-xs font-normal"
                >
                  <SlidersHorizontal className="mr-1.5 size-3.5 text-muted-foreground" />
                  <span className="truncate">{technicianFilterLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="z-[1001] w-[200px] p-1">
                {[
                  { value: "all", label: "Semua Teknisi" },
                  { value: "unassigned", label: "Belum Ditugaskan" },
                  ...technicians.map((technician) => ({
                    value: technician,
                    label: technician,
                  })),
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setTechnicianFilter(item.value);
                      setTechnicianFilterOpen(false);
                    }}
                    className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="truncate">{item.label}</span>
                    {technicianFilter === item.value && <Check className="size-3.5" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* View Toggle */}
            <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
              <button
                type="button"
                aria-pressed={viewMode === "list"}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="size-3.5" />
                Table
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "kanban"}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "kanban"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("kanban")}
              >
                <Columns3 className="size-3.5" />
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Views ---------- */}
        <div className="relative min-h-[520px]">
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "list" ? (
              <motion.div
                key="table"
                initial={viewTransition.initial}
                animate={viewTransition.animate}
                exit={viewTransition.exit}
                transition={viewTransition.transition}
                className="w-full"
              >
                <ServiceListView services={filteredServices} />
              </motion.div>
            ) : (
              <motion.div
                key="kanban"
                initial={viewTransition.initial}
                animate={viewTransition.animate}
                exit={viewTransition.exit}
                transition={viewTransition.transition}
                className="w-full"
              >
                <ServiceKanbanView
                  services={filteredServices}
                  brandSlug={brandSlug}
                  onCardDoubleClick={handleCardDoubleClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <CreateServiceOverlay />
      <ServiceDetailSheet
        service={selectedService}
        open={isDetailOpen}
        onOpenChange={handleSheetOpenChange}
        loading={isDetailLoading}
        brandSlug={brandSlug}
        onServiceUpdated={handleServiceUpdated}
      />
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesPageContent />
    </Suspense>
  );
}
