"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wrench, ShoppingBag, Smartphone, Cpu, RefreshCw } from "lucide-react";

export type StockSelection = "SPAREPART" | "PRODUCT" | "UNIT_BARU" | "UNIT_SECOND";

interface StockTypePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: StockSelection) => void;
}

export function StockTypePickerDialog({ open, onOpenChange, onSelect }: StockTypePickerDialogProps) {
  const [step, setStep] = React.useState<"main" | "unit">("main");

  React.useEffect(() => {
    if (!open) return;
    setStep("main");
  }, [open]);

  const handleMainSelect = (type: "SPAREPART" | "PRODUCT" | "UNIT") => {
    if (type === "UNIT") {
      setStep("unit");
    } else {
      onSelect(type);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Stok</DialogTitle>
          <DialogDescription>
            {step === "main"
              ? "Pilih jenis stok yang ingin ditambahkan."
              : "Pilih tipe unit."}
          </DialogDescription>
        </DialogHeader>

        {step === "main" ? (
          <div className="space-y-2.5">
            <CardButton
              icon={Wrench}
              label="Sparepart"
              desc="Untuk kebutuhan servis, tidak tampil di POS."
              color="border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              iconColor="text-blue-500"
              onClick={() => handleMainSelect("SPAREPART")}
            />
            <CardButton
              icon={ShoppingBag}
              label="Produk"
              desc="Untuk penjualan retail/POS."
              color="border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              iconColor="text-emerald-500"
              onClick={() => handleMainSelect("PRODUCT")}
            />
            <CardButton
              icon={Smartphone}
              label="Unit"
              desc="Perangkat baru atau second yang dijual di POS."
              color="border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              iconColor="text-purple-500"
              onClick={() => handleMainSelect("UNIT")}
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            <CardButton
              icon={Cpu}
              label="Unit Baru"
              desc="Perangkat baru dengan stok quantity."
              color="border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              iconColor="text-indigo-500"
              onClick={() => onSelect("UNIT_BARU")}
            />
            <CardButton
              icon={RefreshCw}
              label="Unit Second"
              desc="Perangkat bekas, dilacak per unit fisik (IMEI)."
              color="border-amber-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              iconColor="text-amber-500"
              onClick={() => onSelect("UNIT_SECOND")}
            />
            <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setStep("main")}>
              &larr; Kembali
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardButton({
  icon: Icon, label, desc, color, iconColor, onClick,
}: {
  icon: React.ElementType; label: string; desc: string; color: string; iconColor: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${color}`}
    >
      <div className={`mt-0.5 rounded-lg p-2 ${iconColor} bg-background`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}
