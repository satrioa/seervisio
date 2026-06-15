"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, XCircle, Smartphone, RefreshCw } from "lucide-react";

/* ── Props ── */

interface CameraBarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
}

type ScannerState = "init" | "scanning" | "found" | "error" | "unsupported";

/* ── Component ── */

export function CameraBarcodeScanner({ open, onOpenChange, onScan }: CameraBarcodeScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [state, setState] = React.useState<ScannerState>("init");
  const [errorMsg, setErrorMsg] = React.useState("");
  const scanIntervalRef = React.useRef<number | null>(null);

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
    setState("init");
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

      setState("scanning");
      startScanning();
    } catch (err: any) {
      setState("error");
      if (err.name === "NotAllowedError") {
        setErrorMsg("Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.");
      } else if (err.name === "NotFoundError") {
        setErrorMsg("Kamera tidak ditemukan pada perangkat ini.");
      } else {
        setErrorMsg(err.message ?? "Gagal mengakses kamera.");
      }
    }
  }, []);

  const startScanning = React.useCallback(() => {
    // Try native BarcodeDetector first
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      scanWithBarcodeDetector();
    } else {
      // Fallback: use @zxing/browser
      scanWithZxing();
    }
  }, []);

  const scanWithBarcodeDetector = React.useCallback(async () => {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "code_93", "codabar", "itf", "upc_a", "upc_e", "data_matrix", "pdf417", "aztec"],
      });

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || streamRef.current === null) return;

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              setState("found");
              stopCamera();
              onScan(rawValue);
              onOpenChange(false);
            }
          }
        } catch {
          // Detection error, continue
        }
      }, 500);
    } catch {
      // BarcodeDetector not available despite feature check
      scanWithZxing();
    }
  }, [stopCamera, onScan, onOpenChange]);

  const scanWithZxing = React.useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const codeReader = new BrowserMultiFormatReader();

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || streamRef.current === null) return;

        try {
          const result = await codeReader.decodeOnceFromVideoElement(
            videoRef.current,
          );
          if (result?.getText()) {
            setState("found");
            stopCamera();
            onScan(result.getText());
            onOpenChange(false);
          }
        } catch {
          // No barcode in current frame, continue
        }
      }, 500);
    } catch {
      setState("unsupported");
      stopCamera();
    }
  }, [stopCamera, onScan, onOpenChange]);

  React.useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setState("init");
      setErrorMsg("");
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const handleRetry = () => {
    if (state === "unsupported") {
      onOpenChange(false);
      return;
    }
    stopCamera();
    setState("init");
    setErrorMsg("");
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stopCamera(); onOpenChange(false); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="size-4" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {state === "init" && (
            <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {state === "scanning" && (
            <div className="relative w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-48 w-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 border-[3px] border-primary/40" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-[10px] text-foreground">
                Arahkan kamera ke barcode
              </div>
            </div>
          )}

          {state === "found" && (
            <div className="flex h-48 w-full items-center justify-center rounded-lg bg-emerald-500/10">
              <p className="text-xs font-medium text-emerald-600">Barcode ditemukan!</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="size-8 text-destructive" />
              <p className="text-center text-xs text-destructive">{errorMsg}</p>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleRetry}>
                <RefreshCw className="mr-1.5 size-3" /> Coba Lagi
              </Button>
            </div>
          )}

          {state === "unsupported" && (
            <div className="flex flex-col items-center gap-2">
              <Smartphone className="size-8 text-muted-foreground" />
              <p className="text-center text-xs text-muted-foreground">
                Browser tidak mendukung scan barcode.
              </p>
              <p className="text-center text-[10px] text-muted-foreground">
                Gunakan Chrome atau Edge terbaru di perangkat mobile/desktop.
              </p>
              <Button size="sm" className="h-8 text-xs" onClick={handleRetry}>
                Tutup
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
