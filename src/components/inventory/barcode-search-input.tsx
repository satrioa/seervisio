"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CameraBarcodeScanner } from "@/components/inventory/camera-barcode-scanner";
import { Camera, QrCode } from "lucide-react";

/* ── Props ── */

interface BarcodeSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onLookup?: (code: string) => void;
  disabled?: boolean;
}

/* ── Component ── */

export function BarcodeSearchInput({
  value,
  onChange,
  placeholder = "Scan atau ketik barcode",
  onLookup,
  disabled,
}: BarcodeSearchInputProps) {
  const [scannerOpen, setScannerOpen] = React.useState(false);

  const handleScan = (code: string) => {
    onChange(code);
    onLookup?.(code);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onLookup?.(value.trim());
    }
  };

  return (
    <>
      <div className="relative flex items-center">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 pr-9 text-xs font-mono"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
          onClick={() => setScannerOpen(true)}
          disabled={disabled}
          title="Scan barcode"
        >
          <Camera className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
      <CameraBarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />
    </>
  );
}
