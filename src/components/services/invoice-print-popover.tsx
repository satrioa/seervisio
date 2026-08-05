"use client";

import * as React from "react";
import { Loader2, Printer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThermalReceipt } from "@/components/services/thermal-receipt";
import { printerService } from "@/services/printer/printer-service";
import type { InvoiceData } from "@/server/actions/invoice-data.actions";
import { printInvoiceDataInIframe } from "@/lib/print-iframe";

type InvoiceResult =
  | { success: true; data: InvoiceData }
  | { success: false; error: string };

interface InvoicePrintPopoverProps {
  loadInvoice: () => Promise<InvoiceResult>;
  label?: string;
  triggerClassName?: string;
}

export function InvoicePrintPopover({ loadInvoice, label = "Print Invoice", triggerClassName }: InvoicePrintPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<InvoiceData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpen = async () => {
    if (!printerService.connected) {
      const result = await loadInvoice();
      if (result.success) await printInvoiceDataInIframe(result.data);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);
    const result = await loadInvoice();
    if (result.success) setData(result.data);
    else setError(result.error);
    setLoading(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(event) => {
            if (!printerService.connected) event.preventDefault();
          }}
          onClick={(event) => {
            if (!printerService.connected) event.preventDefault();
            void handleOpen();
          }}
          className={triggerClassName ?? "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"}
        >
          <Printer className="size-3.5" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,460px)] p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat preview...
          </div>
        ) : error ? (
          <p className="p-4 text-center text-xs text-destructive">{error}</p>
        ) : data ? (
          <ThermalReceipt data={data} baseUrl={window.location.origin} embeddedPreview />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
