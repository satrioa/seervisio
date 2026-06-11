"use client";

import * as React from "react";
import {
  Search,
  LayoutList,
  Columns3,
  Filter,
  SlidersHorizontal,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateServiceOverlay } from "@/components/services/create-service-overlay";

import {
  MOCK_SERVICES,
  type ServiceStatus,
  STATUS_CONFIG,
  STATUS_ORDER,
} from "@/components/services/service-data";
import { ServiceListView } from "@/components/services/service-list-view";
import { ServiceKanbanView } from "@/components/services/service-kanban-view";

type ViewMode = "list" | "kanban";

export default function ServicesPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ServiceStatus | "all">("all");
  const [technicianFilter, setTechnicianFilter] = React.useState("all");
  const technicians = React.useMemo(
    () =>
      Array.from(
        new Set(MOCK_SERVICES.map((service) => service.technician).filter(Boolean))
      ).sort() as string[],
    []
  );

  // Filter services
  const filteredServices = React.useMemo(() => {
    let result = MOCK_SERVICES;

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
  }, [search, statusFilter, technicianFilter]);

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
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ServiceStatus | "all")}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <Filter className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent align="end" className="z-[1001]">
              <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Technician Filter */}
          <Select
            value={technicianFilter}
            onValueChange={setTechnicianFilter}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SlidersHorizontal className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Semua Teknisi" />
            </SelectTrigger>
            <SelectContent align="end" className="z-[1001]">
              <SelectItem value="all" className="text-xs">Semua Teknisi</SelectItem>
              <SelectItem value="unassigned" className="text-xs">
                Belum Ditugaskan
              </SelectItem>
              {technicians.map((technician) => (
                <SelectItem key={technician} value={technician} className="text-xs">
                  {technician}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-card p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <LayoutList className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("kanban")}
              aria-label="Kanban view"
            >
              <Columns3 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- Views ---------- */}
      {viewMode === "list" ? (
        <ServiceListView services={filteredServices} />
      ) : (
        <ServiceKanbanView services={filteredServices} />
      )}
    </div>
      <CreateServiceOverlay />
    </>
  );
}
