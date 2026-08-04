"use client";

import * as React from "react";
import { Store, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/r-switch";
import { SlideToVerify } from "@/components/ui/slide-to-verify";
import { verifyServicePickupAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import type { ServiceRecord } from "@/components/services/service-data";

interface RepresentativePickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug: string;
  onSuccess: () => void;
}

export function RepresentativePickupDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  onSuccess,
}: RepresentativePickupDialogProps) {
  const [name, setName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [idNumber, setIdNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [selfPickup, setSelfPickup] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setRelationship("");
      setPhone("");
      setIdNumber("");
      setNotes("");
      setSelfPickup(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const readyToSlide = selfPickup
    ? true
    : name.trim().length > 0 && relationship.trim().length > 0 && phone.trim().length > 0;

  const handleSlideComplete = async () => {
    if (!readyToSlide || submitting) return;
    setSubmitting(true);

    const pickupName = selfPickup ? service.customerName : name.trim();
    const pickupRelation = selfPickup ? "Self" : relationship.trim();
    const pickupPhone = selfPickup ? undefined : phone.trim() || undefined;
    const pickupNote = selfPickup
      ? (notes.trim() || undefined)
      : [idNumber.trim() ? `KTP: ${idNumber.trim()}` : "", notes.trim()]
          .filter(Boolean)
          .join("\n") || undefined;

    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Verifying pickup",
      description: "Processing...",
    });
    try {
      const result = await verifyServicePickupAction({
        brandSlug,
        serviceId: service.id,
        pickupName,
        pickupPhone,
        pickupRelation,
        pickupNote,
        checklist: {
          unitChecked: true,
          paymentConfirmed: true,
          customerAcceptedCondition: true,
        },
      });
      if (result.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Pickup verified",
          description: `Device handed to ${pickupName}.`,
          duration: 1800,
        });
        onSuccess();
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Verification failed",
          description: result.error ?? "Failed.",
          duration: 2400,
        });
        setError(result.error ?? "Failed.");
        setSubmitting(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error.";
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Verification failed",
        description: msg,
        duration: 2400,
      });
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Store className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Picked up by Representative</DialogTitle>
              <DialogDescription className="text-xs">
                {service.deviceName} &mdash; {service.serviceNumber || service.id}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
            <div className="min-w-0 pr-3">
              <p className="text-xs font-medium text-foreground">Diambil sendiri</p>
              <p className="text-[10px] text-muted-foreground">
                Unit diambil langsung oleh {service.customerName || "pelanggan"}.
              </p>
            </div>
            <Switch
              checked={selfPickup}
              onCheckedChange={setSelfPickup}
              label=""
              description=""
              aria-label="Diambil sendiri oleh pelanggan"
            />
          </div>

          {!selfPickup && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">
                  Representative Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Relationship <span className="text-destructive">*</span>
                </Label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {["Family", "Friend", "Colleague", "Driver", "Courier", "Other"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxx"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  ID Number <span className="text-[10px] text-muted-foreground/60">(optional)</span>
                </Label>
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="KTP / SIM"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Notes <span className="text-[10px] text-muted-foreground/60">(optional)</span>
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional info"
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {selfPickup && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Notes <span className="text-[10px] text-muted-foreground/60">(optional)</span>
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional info"
                className="text-xs h-9"
              />
            </div>
          )}

          <Separator />

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <SlideToVerify
            onComplete={handleSlideComplete}
            disabled={!readyToSlide || submitting}
            disabledMessage={
              !readyToSlide && !submitting
                ? "Fill in all required fields first"
                : undefined
            }
            label={submitting ? "Verifying..." : "Slide to confirm pickup"}
            loading={submitting}
          />

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              <X className="size-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
