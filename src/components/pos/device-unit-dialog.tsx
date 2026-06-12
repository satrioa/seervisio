// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smartphone, Cpu, HardDrive, Battery, Check } from "lucide-react";
import type { CartDeviceUnit } from "@/domain/pos/types";

interface DeviceUnitDialogProps {
  units: CartDeviceUnit[];
  productName: string;
  onSelect: (unit: CartDeviceUnit) => void;
  onClose: () => void;
}

export function DeviceUnitDialog({
  units,
  productName,
  onSelect,
  onClose,
}: DeviceUnitDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih Unit</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-80">
          <div className="space-y-2 pr-3">
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada unit tersedia.
              </p>
            ) : (
              units.map((unit) => (
                <div
                  key={unit.unitId}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors hover:border-primary/50"
                  onClick={() => onSelect(unit)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {unit.storage || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {unit.imei && (
                        <Badge variant="outline" className="text-[10px]">
                          IMEI: {unit.imei}
                        </Badge>
                      )}
                      {unit.color && (
                        <Badge variant="outline" className="text-[10px]">
                          <span className="flex items-center gap-1">
                            <span className="block h-2 w-2 rounded-full border" style={{ backgroundColor: unit.color.toLowerCase() }} />
                            {unit.color}
                          </span>
                        </Badge>
                      )}
                      {unit.conditionGrade && (
                        <Badge variant="outline" className="text-[10px]">
                          {unit.conditionGrade}
                        </Badge>
                      )}
                      {unit.batteryHealth && (
                        <Badge variant="outline" className="text-[10px]">
                          Baterai: {unit.batteryHealth}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold">
                      Rp {unit.sellingPrice.toLocaleString("id-ID")}
                    </p>
                    <Button size="sm" variant="ghost" className="h-7 px-2 mt-1">
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Pilih
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
