"use client";

import * as React from "react";
import { Camera, CheckCircle2, QrCode, Loader2, XCircle, Smartphone, RefreshCw, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SlideToVerify } from "@/components/ui/slide-to-verify";
import { verifyServicePickupAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import type { ServiceRecord } from "@/components/services/service-data";

interface QRVerifyPickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug: string;
  onSuccess: () => void;
}

type ScanState = "init" | "scanning" | "matched" | "error" | "unsupported";

export function QRVerifyPickupDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  onSuccess,
}: QRVerifyPickupDialogProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<number | null>(null);
  const [scanState, setScanState] = React.useState<ScanState>("init");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const stopCamera = React.useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = React.useCallback(async () => {
    setScanState("init");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState("scanning");
      startScanning();
    } catch (err: any) {
      setScanState("error");
      if (err.name === "NotAllowedError") {
        setErrorMsg("Camera access denied. Allow camera access in browser settings.");
      } else if (err.name === "NotFoundError") {
        setErrorMsg("No camera found on this device.");
      } else {
        setErrorMsg(err.message ?? "Failed to access camera.");
      }
    }
  }, []);

  const startScanning = React.useCallback(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      scanWithBarcodeDetector();
    } else {
      scanWithZxing();
    }
  }, []);

  const checkServiceMatch = React.useCallback(
    (scannedText: string) => {
      const id = service.id.toLowerCase();
      const number = (service.serviceNumber ?? "").toLowerCase();
      const text = scannedText.toLowerCase();
      return text.includes(id) || text.includes(number) || text.includes(encodeURIComponent(id));
    },
    [service.id, service.serviceNumber],
  );

  const scanWithBarcodeDetector = React.useCallback(async () => {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || streamRef.current === null) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              if (checkServiceMatch(rawValue)) {
                stopCamera();
                setScanState("matched");
              }
            }
          }
        } catch {
          /* continue */
        }
      }, 500);
    } catch {
      scanWithZxing();
    }
  }, [stopCamera, checkServiceMatch]);

  const scanWithZxing = React.useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const codeReader = new BrowserMultiFormatReader();
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || streamRef.current === null) return;
        try {
          const result = await codeReader.decodeOnceFromVideoElement(videoRef.current);
          if (result?.getText()) {
            if (checkServiceMatch(result.getText())) {
              stopCamera();
              setScanState("matched");
            }
          }
        } catch {
          /* continue */
        }
      }, 500);
    } catch {
      setScanState("unsupported");
      stopCamera();
    }
  }, [stopCamera, checkServiceMatch]);

  React.useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setScanState("init");
      setErrorMsg("");
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const handleRetry = () => {
    if (scanState === "unsupported") {
      onOpenChange(false);
      return;
    }
    stopCamera();
    setScanState("init");
    setErrorMsg("");
    startCamera();
  };

  const handleSlideComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Verifying pickup",
      description: "Processing...",
    });
    try {
      const result = await verifyServicePickupAction({
        brandSlug,
        serviceId: service.id,
        pickupName: service.customerName,
        pickupRelation: "QR",
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
          description: "QR verified. Device handed to customer.",
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
        setErrorMsg(result.error ?? "Failed.");
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
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stopCamera();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <QrCode className="size-4" />
            QR Pickup Verification
          </DialogTitle>
          <DialogDescription className="text-xs">
            {service.deviceName} &mdash; {service.serviceNumber || service.id}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {scanState === "init" && (
            <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {scanState === "scanning" && (
            <div className="relative w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-48 w-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 border-[3px] border-primary/40" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-[10px] text-foreground whitespace-nowrap">
                Scan customer QR code
              </div>
            </div>
          )}

          {scanState === "matched" && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex h-32 w-full items-center justify-center rounded-lg bg-emerald-500/10 gap-2">
                <CheckCircle2 className="size-6 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-emerald-600">QR Matched!</p>
                  <p className="text-[10px] text-emerald-600/70">
                    {service.customerName} &mdash; {service.serviceNumber || service.id}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-destructive text-center">{errorMsg}</p>
              )}

              <SlideToVerify
                onComplete={handleSlideComplete}
                disabled={submitting}
                label={submitting ? "Verifying..." : "Slide to confirm pickup"}
                loading={submitting}
              />

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
          )}

          {scanState === "error" && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="size-8 text-destructive" />
              <p className="text-center text-xs text-destructive">{errorMsg}</p>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleRetry}>
                <RefreshCw className="mr-1.5 size-3" /> Retry
              </Button>
            </div>
          )}

          {scanState === "unsupported" && (
            <div className="flex flex-col items-center gap-2">
              <Smartphone className="size-8 text-muted-foreground" />
              <p className="text-center text-xs text-muted-foreground">
                Your browser does not support QR scanning.
              </p>
              <p className="text-center text-[10px] text-muted-foreground">
                Use Chrome or Edge on a mobile or desktop device.
              </p>
              <Button size="sm" className="h-8 text-xs" onClick={handleRetry}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
