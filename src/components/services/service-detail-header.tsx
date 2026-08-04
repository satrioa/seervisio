"use client";

import * as React from "react";
import { X, Share2, Phone, Copy, Check, ExternalLink, QrCode, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ServiceDeviceIcon } from "@/components/services/service-device-icon";
import { STATUS_CONFIG } from "@/components/services/service-data";
import type { ServiceRecord, ServiceStatus } from "@/components/services/service-data";
import { getServicePortalShareDataAction } from "@/server/actions/customer-portal.actions";

interface ServiceDetailHeaderProps {
  service: ServiceRecord;
  localStatus: ServiceStatus;
  onClose: () => void;
}

export function ServiceDetailHeader({ service, localStatus, onClose }: ServiceDetailHeaderProps) {
  return (
    <div className="shrink-0 border-b bg-background px-6 py-4">
      <div className="flex items-center gap-3">
        <ServiceDeviceIcon iconKey={service.deviceIconKey} className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {service.serviceNumber || service.id}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${STATUS_CONFIG[localStatus].color}`}
            >
              <span className={`size-1.5 rounded-full ${STATUS_CONFIG[localStatus].dot}`} />
              {STATUS_CONFIG[localStatus].label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {service.deviceName} · {service.customerName}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <SharePopover service={service} />
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SharePopover({ service }: { service: ServiceRecord }) {
  const [data, setData] = React.useState<{
    trackingToken: string | null;
    brandName: string;
    brandSlug: string;
    whatsappNumber: string | null;
    customerPhone: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState<"link" | "invoice" | "summary" | null>(null);
  const [showQr, setShowQr] = React.useState(false);

  React.useEffect(() => {
    getServicePortalShareDataAction(service.id).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [service.id]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trackingUrl = data?.trackingToken ? `${baseUrl}/t/${data.trackingToken}` : null;
  const invoiceUrl = `${baseUrl}/${data?.brandSlug}/invoice/${service.id}`;

  const copyToClipboard = async (type: "link" | "invoice" | "summary") => {
    let text: string;
    if (type === "link") {
      text = trackingUrl || `${baseUrl}/track/${data?.brandSlug}?invoice=${service.serviceNumber || service.id}`;
    } else if (type === "invoice") {
      text = invoiceUrl;
    } else {
      text = [
        `Service: ${service.serviceNumber || service.id}`,
        `Customer: ${service.customerName}`,
        `Device: ${service.deviceName}`,
        `Status: ${STATUS_CONFIG[service.status as ServiceStatus]?.label || service.status}`,
        `Issue: ${service.issue}`,
      ].join("\n");
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const message = data
    ? `Halo ${service.customerName} 👋\n\nServis perangkat Anda di *${data.brandName}* sedang diproses.\n\n📱 ${service.deviceName}\n🧾 ${service.serviceNumber || service.id}\n\nSilakan pantau progress servis dan invoice digital melalui tautan berikut:\n\n${trackingUrl}\n\nTerima kasih 🙏\n\n${data.brandName}`
    : "";

  const waUrl = data?.customerPhone
    ? `https://wa.me/${data.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : data?.whatsappNumber
      ? `https://wa.me/${data.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
      : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Share">
          <Share2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : !data ? (
          <p className="p-2 text-xs text-muted-foreground">Data tidak tersedia.</p>
        ) : (
          <div className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bagikan ke Pelanggan
            </p>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                style={{ color: "#25D366" }}
              >
                <Phone className="size-3.5" />
                WhatsApp
              </a>
            )}
            {trackingUrl && (
              <button
                type="button"
                onClick={() => copyToClipboard("link")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                {copied === "link" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copied === "link" ? <span className="text-emerald-600">Tersalin!</span> : "Salin Tautan Tracking"}
              </button>
            )}
            <button
              type="button"
              onClick={() => copyToClipboard("invoice")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              {copied === "invoice" ? <Check className="size-3.5 text-emerald-500" /> : <ExternalLink className="size-3.5" />}
              {copied === "invoice" ? <span className="text-emerald-600">Tersalin!</span> : "Salin Tautan Invoice"}
            </button>
            {trackingUrl && (
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <QrCode className="size-3.5" />
                {showQr ? "Sembunyikan QR" : "Tampilkan QR"}
              </button>
            )}
            <Separator className="my-1" />
            <button
              type="button"
              onClick={() => window.open(`${invoiceUrl}?print=true`, "_blank")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Printer className="size-3.5" />
              Print Invoice
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard("summary")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              {copied === "summary" ? <Check className="size-3.5 text-emerald-500" /> : <FileText className="size-3.5" />}
              {copied === "summary" ? <span className="text-emerald-600">Tersalin!</span> : "Copy Summary"}
            </button>
            {showQr && trackingUrl && (
              <div className="mt-2 flex justify-center rounded-lg bg-muted/30 p-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}`}
                  alt="QR"
                  className="size-24 rounded-lg"
                />
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
