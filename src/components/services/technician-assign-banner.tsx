"use client";

import * as React from "react";
import { User, UserPlus, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  assignServiceTechnicianAction,
  listTechniciansAction,
  type TechnicianOption,
} from "@/server/actions/service.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import type { ServiceRecord } from "@/components/services/service-data";

interface TechnicianAssignBannerProps {
  service: ServiceRecord;
  brandSlug: string;
  onAssigned: () => void;
}

export function TechnicianAssignBanner({
  service,
  brandSlug,
  onAssigned,
}: TechnicianAssignBannerProps) {
  const [open, setOpen] = React.useState(false);
  const [technicians, setTechnicians] = React.useState<TechnicianOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    listTechniciansAction(brandSlug, service.branchId).then((res) => {
      if (res.success) setTechnicians(res.data);
      setLoading(false);
    });
  }, [open, brandSlug, service.branchId]);

  const handleSelect = async (profileId: string) => {
    setOpen(false);
    setAssigning(true);
    try {
      const res = await assignServiceTechnicianAction(brandSlug, service.id, profileId);
      if (res.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Teknisi ditugaskan",
          description: `Teknisi berhasil ditugaskan ke ${service.serviceNumber}`,
          duration: 1800,
        });
        onAssigned();
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal menugaskan teknisi",
          description: res.error ?? "Terjadi kesalahan.",
          duration: 2400,
        });
      }
    } catch {
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Gagal menugaskan teknisi",
        description: "Terjadi kesalahan tidak terduga.",
        duration: 2400,
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/10">
      <div className="flex shrink-0 items-center justify-center rounded-full bg-amber-100 p-1.5 dark:bg-amber-900/20">
        <User className="size-3.5 text-amber-700 dark:text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Teknisi belum ditugaskan
        </p>
        <p className="text-[11px] text-amber-600/80 dark:text-amber-400/60">
          Tugaskan teknisi sebelum mengubah status servis
        </p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 border-amber-300 bg-white text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/30"
            disabled={assigning}
          >
            {assigning ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-amber-600/30 border-t-amber-600" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Pilih Teknisi
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 shadow-lg" align="end">
          <Command>
            <CommandInput placeholder="Cari teknisi..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "Memuat..." : "Tidak ada teknisi"}
              </CommandEmpty>
              <CommandGroup>
                {technicians.map((tech) => (
                  <CommandItem
                    key={tech.profileId}
                    value={tech.name}
                    onSelect={() => handleSelect(tech.profileId)}
                  >
                    <Check className="mr-2 size-3.5 opacity-0" />
                    {tech.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
