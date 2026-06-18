"use client";

import * as React from "react";
import { User, UserPlus, UserX, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  assignServiceTechnicianAction,
  listTechniciansAction,
  type TechnicianOption,
} from "@/server/actions/service.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import type { ServiceRecord } from "@/components/services/service-data";

interface AssignTechnicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug: string;
  onConfirm: () => void;
}

const UNASSIGN_VALUE = "**UNASSIGN_TECHNICIAN**";

export function AssignTechnicianDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  onConfirm,
}: AssignTechnicianDialogProps) {
  const [technicians, setTechnicians] = React.useState<TechnicianOption[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = React.useState<string>(
    service.assignedTechnicianId ?? UNASSIGN_VALUE,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [techsLoading, setTechsLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedTechnicianId(service.assignedTechnicianId ?? UNASSIGN_VALUE);
      setTechsLoading(true);
      listTechniciansAction(brandSlug, service.branchId).then((res) => {
        if (res.success) {
          setTechnicians(res.data);
        }
        setTechsLoading(false);
      });
    }
  }, [open, brandSlug, service.branchId, service.assignedTechnicianId]);

  const hasChanges = selectedTechnicianId !== (service.assignedTechnicianId ?? UNASSIGN_VALUE);
  const noTechsAvailable = !techsLoading && technicians.length === 0;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const technicianId = selectedTechnicianId === UNASSIGN_VALUE ? null : selectedTechnicianId;
      const res = await assignServiceTechnicianAction(brandSlug, service.id, technicianId);

      if (res.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: technicianId ? "Teknisi ditugaskan" : "Teknisi dihapus",
          description: technicianId
            ? `Teknisi berhasil ditugaskan ke ${service.serviceNumber}`
            : `Teknisi berhasil dihapus dari ${service.serviceNumber}`,
          duration: 1800,
        });
        onConfirm();
        onOpenChange(false);
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal menugaskan teknisi",
          description: res.error ?? "Terjadi kesalahan.",
          duration: 2400,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Gagal menugaskan teknisi",
        description: msg,
        duration: 2400,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            {service.assignedTechnicianId ? "Ubah Teknisi" : "Tugaskan Teknisi"}
          </DialogTitle>
          <DialogDescription>
            {service.serviceNumber || service.deviceName} — {service.branchName || "Cabang tidak diketahui"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {service.technicianName && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <User className="size-3.5" />
              <span>
                Teknisi saat ini: <strong>{service.technicianName}</strong>
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Pilih Teknisi
            </label>
            {noTechsAvailable ? (
              <Alert variant="default" className="border-dashed py-3">
                <Info className="size-4" />
                <AlertTitle className="text-xs font-semibold">
                  Belum ada teknisi aktif untuk cabang {service.branchName || "ini"}.
                </AlertTitle>
                <AlertDescription className="text-[11px]">
                  Tambahkan akses cabang untuk teknisi di halaman Account, atau pilih servis dari cabang yang sesuai.
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedTechnicianId}
                onValueChange={setSelectedTechnicianId}
                disabled={techsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={techsLoading ? "Memuat teknisi..." : "Pilih teknisi"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGN_VALUE}>
                    <span className="text-muted-foreground">Tidak ditugaskan</span>
                  </SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.profileId} value={tech.profileId}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>
          {!noTechsAvailable && (
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                "Menyimpan..."
              ) : selectedTechnicianId === UNASSIGN_VALUE && service.assignedTechnicianId ? (
                <>
                  <UserX className="size-3.5" />
                  Hapus Teknisi
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  {service.assignedTechnicianId ? "Ubah Teknisi" : "Tugaskan Teknisi"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
