"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { getPackagesListAction, changeSubscriptionPackageAction } from "@/server/actions/subscription.actions";
import type { PackageRow, SubscriptionRow } from "@/server/repositories/platform.repository";

interface ChangePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionRow;
  onSuccess: () => void;
}

export function ChangePackageDialog({ open, onOpenChange, subscription, onSuccess }: ChangePackageDialogProps) {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState(subscription.plan);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getPackagesListAction().then((res) => {
        if (res.success) {
          setPackages(res.data);
          const current = res.data.find((p) => p.slug === subscription.plan);
          if (current) setSelectedPackageId(current.id);
        }
        setLoading(false);
      });
    }
  }, [open, subscription.plan]);

  const selectedPkg = packages.find((p) => p.id === selectedPackageId);

  const handleSave = async () => {
    if (!selectedPackageId) return;
    setSaving(true);
    const res = await changeSubscriptionPackageAction(
      subscription.id,
      selectedPackageId,
      new Date(startDate).toISOString(),
      endDate ? new Date(endDate).toISOString() : null,
    );
    if (res.success) {
      toast.success("Paket berhasil diubah");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(res.error || "Gagal mengubah paket");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4" />
            Change Package — {subscription.brandName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih paket baru dan tentukan periode langganan
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Package</Label>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} — Rp {p.price.toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPkg && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium text-foreground">{selectedPkg.name}</p>
                <p className="text-muted-foreground">{selectedPkg.description || "-"}</p>
                <div className="flex gap-4 pt-1 text-muted-foreground">
                  <span>Max {selectedPkg.maxBranches} cabang</span>
                  <span>Max {selectedPkg.maxUsers} pengguna</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !selectedPackageId}>
                {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Change Package
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
