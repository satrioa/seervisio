"use client";

import * as React from "react";
import { Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Search,
  LayoutList,
  Columns3,
  SlidersHorizontal,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CreateServiceOverlay } from "@/components/services/create-service-overlay";
import { ServicePaymentPanel } from "@/components/services/service-payment-panel";
import { ServiceSparepartPanel } from "@/components/services/service-sparepart-panel";

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
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { listServicesAction, getServiceDetailAction, getSessionRoleAction } from "@/server/actions/service.actions";

type ViewMode = "list" | "kanban";

const viewTransition = {
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

const viewVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 36 : -36,
    scale: 0.985,
    filter: "blur(6px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -36 : 36,
    scale: 0.985,
    filter: "blur(6px)",
  }),
};

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { setOnServiceUpdated, showDetail } = useRightSidebar();
  const { activeBranchId } = useActiveBranch();

  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [viewDirection, setViewDirection] = React.useState(1);
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

  const handleViewModeChange = React.useCallback(
    (nextMode: ViewMode) => {
      if (nextMode === viewMode) return;

      setViewDirection(nextMode === "kanban" ? 1 : -1);
      setViewMode(nextMode);
      window.dispatchEvent(
        new CustomEvent("seervis:services-view-mode-change", {
          detail: { mode: nextMode },
        })
      );
    },
    [viewMode]
  );

  // Filters State
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ServiceStatus | "all">("all");
  const [technicianFilter, setTechnicianFilter] = React.useState("all");
  const [pickupFilter, setPickupFilter] = React.useState<string>("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [technicianFilterOpen, setTechnicianFilterOpen] = React.useState(false);
  const [pickupFilterOpen, setPickupFilterOpen] = React.useState(false);

  const hasActiveFilters =
    statusFilter !== "all" ||
    technicianFilter !== "all" ||
    pickupFilter !== "all";

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (technicianFilter !== "all" ? 1 : 0) +
    (pickupFilter !== "all" ? 1 : 0);

  // Keep panel open if filters are active
  React.useEffect(() => {
    if (hasActiveFilters) {
      setFiltersOpen(true);
    }
  }, [hasActiveFilters]);

  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [services, setServices] = React.useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [paymentServiceId, setPaymentServiceId] = React.useState<string | null>(null);
  const [sparepartServiceId, setSparepartServiceId] = React.useState<string | null>(null);

  const paymentService = React.useMemo(
    () => services.find((s) => s.id === paymentServiceId) ?? null,
    [services, paymentServiceId],
  );

  const sparepartService = React.useMemo(
    () => services.find((s) => s.id === sparepartServiceId) ?? null,
    [services, sparepartServiceId],
  );

  const handleOpenPayment = React.useCallback((serviceId: string) => {
    setPaymentServiceId(serviceId);
  }, []);

  const handleOpenSparepart = React.useCallback((serviceId: string) => {
    setSparepartServiceId(serviceId);
  }, []);

  const fetchServices = React.useCallback(async () => {
    const normalizedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES"
      ? activeBranchId
      : null;
    setIsLoading(true);
    setError(null);
    try {
      const [servicesResult, roleResult] = await Promise.all([
        listServicesAction({ brandSlug, branchId: normalizedBranchId }),
        getSessionRoleAction(brandSlug),
      ]);
      if (!servicesResult.ok) {
        setServices([]);
        setError(servicesResult.error ?? "Gagal memuat data servis");
        return;
      }
      setServices(servicesResult.data);
      if (roleResult.success) {
        setUserRole(roleResult.data.role);
      }
    } catch (err) {
      console.error("[services:page] fetch exception", err);
      setServices([]);
      setError("Gagal memuat data servis");
    } finally {
      setIsLoading(false);
    }
  }, [brandSlug, activeBranchId]);

  React.useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const selectedService = React.useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const technicians = React.useMemo(
    () =>
      Array.from(
        new Set(services.map((service) => service.technicianName).filter(Boolean))
      ).sort() as string[],
    [services]
  );

  // Restore right sidebar from URL on mount
  React.useEffect(() => {
    const serviceId = searchParams.get("service");
    if (serviceId && services.length > 0) {
      setSelectedServiceId(serviceId);
      setIsDetailOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

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
    },
    [updateUrlParam]
  );

  const handleSheetOpenChange = React.useCallback(
    (open: boolean) => {
      setIsDetailOpen(open);
      if (!open) {
        updateUrlParam(null);
      }
    },
    [updateUrlParam]
  );

  const handleServiceUpdated = useCallback(async () => {
    await fetchServices();
    if (selectedServiceId) {
      const result = await getServiceDetailAction(brandSlug, selectedServiceId);
      if (result.success) {
        showDetail(result.data);
      }
    }
    router.refresh();
  }, [brandSlug, selectedServiceId, fetchServices, showDetail, router]);

  // Wire refresh callback into right sidebar context so sidebar mutations refresh the page
  React.useEffect(() => {
    setOnServiceUpdated(handleServiceUpdated);
    return () => setOnServiceUpdated(undefined);
  }, [handleServiceUpdated, setOnServiceUpdated]);

  // Listen for refresh events from Kanban (dispatched after status update)
  React.useEffect(() => {
    const handleRefresh = () => {
      handleServiceUpdated();
    };
    window.addEventListener("seervis:services-refresh", handleRefresh);
    return () => window.removeEventListener("seervis:services-refresh", handleRefresh);
  }, [handleServiceUpdated]);

  const statusFilterLabel =
    statusFilter === "all" ? "Semua Status" : STATUS_CONFIG[statusFilter].label;
  const technicianFilterLabel =
    technicianFilter === "all"
      ? "Semua Teknisi"
      : technicianFilter === "unassigned"
        ? "Belum Ditugaskan"
        : technicianFilter;
  const pickupFilterLabel = 
    pickupFilter === "all" ? "Semua Pengambilan" :
    pickupFilter === "not_ready" ? "Belum Siap" :
    pickupFilter === "ready" ? "Siap Diambil" :
    pickupFilter === "picked_up" ? "Sudah Diambil" : "Semua";

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ---------- Toolbar ---------- */}
        <div className="flex flex-col gap-3">
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
              {/* Filter Button */}
              <Button
                type="button"
                variant={filtersOpen || hasActiveFilters ? "default" : "outline"}
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="h-9 gap-1.5 px-3 text-xs"
              >
                <SlidersHorizontal className="size-3.5" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant={filtersOpen || hasActiveFilters ? "secondary" : "default"} className="ml-1 h-4 px-1 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
                {filtersOpen ? (
                  <ChevronUp className="ml-0.5 size-3.5 opacity-50" />
                ) : (
                  <ChevronDown className="ml-0.5 size-3.5 opacity-50" />
                )}
              </Button>

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
                  onClick={() => handleViewModeChange("list")}
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
                  onClick={() => handleViewModeChange("kanban")}
                >
                  <Columns3 className="size-3.5" />
                  Kanban
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel (Collapsible) */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3">
                  {/* Status Filter */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">Status</span>
                    <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between px-3 text-xs font-normal bg-background"
                        >
                          <span className="truncate">{statusFilterLabel}</span>
                          <ChevronDown className="size-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="z-[1001] w-[180px] p-1">
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
                  </div>

                  {/* Technician Filter */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">Teknisi</span>
                    <Popover
                      open={technicianFilterOpen}
                      onOpenChange={setTechnicianFilterOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between px-3 text-xs font-normal bg-background"
                        >
                          <span className="truncate">{technicianFilterLabel}</span>
                          <ChevronDown className="size-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="z-[1001] w-[200px] p-1">
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
                  </div>

                  {/* Pickup Filter */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">Pengambilan</span>
                    <Popover
                      open={pickupFilterOpen}
                      onOpenChange={setPickupFilterOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between px-3 text-xs font-normal bg-background"
                        >
                          <span className="truncate">{pickupFilterLabel}</span>
                          <ChevronDown className="size-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="z-[1001] w-[180px] p-1">
                        {[
                          { value: "all", label: "Semua" },
                          { value: "not_ready", label: "Belum Siap" },
                          { value: "ready", label: "Siap Diambil" },
                          { value: "picked_up", label: "Sudah Diambil" },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setPickupFilter(item.value);
                              setPickupFilterOpen(false);
                            }}
                            className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <span>{item.label}</span>
                            {pickupFilter === item.value && <Check className="size-3.5" />}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------- Views ---------- */}
        <div className="relative min-h-[520px] overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={viewDirection}>
            {viewMode === "list" ? (
              <motion.div
                key="table"
                custom={viewDirection}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={viewTransition.transition}
                className="w-full"
              >
                <ServiceListView
                  services={services}
                  isLoading={isLoading}
                  error={error}
                  search={search}
                  statusFilter={statusFilter}
                  technicianFilter={technicianFilter}
                  pickupFilter={pickupFilter}
                  role={userRole ?? undefined}
                  brandSlug={brandSlug}
                  onServiceUpdated={handleServiceUpdated}
                  onOpenPayment={handleOpenPayment}
                  onOpenSparepart={handleOpenSparepart}
                />
              </motion.div>
            ) : (
              <motion.div
                key="kanban"
                custom={viewDirection}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={viewTransition.transition}
                className="w-full"
              >
                <ServiceKanbanView
                  services={services}
                  brandSlug={brandSlug}
                  isLoading={isLoading}
                  error={error}
                  search={search}
                  statusFilter={statusFilter}
                  technicianFilter={technicianFilter}
                  pickupFilter={pickupFilter}
                  role={userRole ?? undefined}
                  onCardDoubleClick={handleCardDoubleClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <CreateServiceOverlay onSuccess={fetchServices} />
      <ServiceDetailSheet
        service={selectedService}
        open={isDetailOpen}
        onOpenChange={handleSheetOpenChange}
        loading={false}
        brandSlug={brandSlug}
        onServiceUpdated={handleServiceUpdated}
        role={userRole ?? undefined}
      />
      {paymentService && (
        <ServicePaymentPanel
          service={paymentService}
          open
          onOpenChange={(open) => { if (!open) setPaymentServiceId(null); }}
          brandSlug={brandSlug}
          onPaymentRecorded={() => {
            setPaymentServiceId(null);
            handleServiceUpdated();
          }}
        />
      )}
      <ServiceSparepartPanel
        service={sparepartService}
        open={Boolean(sparepartService)}
        onOpenChange={(open) => { if (!open) setSparepartServiceId(null); }}
        brandSlug={brandSlug}
        onSparepartAdded={() => {
          setSparepartServiceId(null);
          handleServiceUpdated();
        }}
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
