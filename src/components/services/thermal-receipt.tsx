"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Printer, Loader2, Check } from "lucide-react";
import { generateBarcodeSvg, barcodeSvgToDataUrl } from "@/lib/barcode";
import type { InvoiceData } from "@/server/actions/invoice-data.actions";
import type { ReceiptSection } from "@/lib/receipt-sections";
import { printerService } from "@/services/printer/printer-service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

interface ThermalReceiptProps {
  data: InvoiceData;
  baseUrl: string;
  autoPrint?: boolean;
  embeddedPreview?: boolean;
}

function SectionStoreLogo({ section, brand }: { section: ReceiptSection; brand: InvoiceData["brand"] }) {
  if (!section.enabled) return null;
  const logoUrl = section.config?.logoUrl || brand.settings?.logoUrl;
  return (
    <div style={{ textAlign: "center", marginBottom: "6px" }}>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" style={{ display: "block", maxWidth: "120px", maxHeight: "40px", margin: "0 auto", objectFit: "contain" }} />
      ) : null}
    </div>
  );
}

function SectionStoreInfo({ section, brand }: { section: ReceiptSection; brand: InvoiceData["brand"] }) {
  if (!section.enabled) return null;
  const storeName = brand.settings?.storeName || brand.name;
  return (
    <div style={{ textAlign: "center", marginBottom: "6px" }}>
      <p style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0, color: "#111" }}>{storeName}</p>
      {brand.settings?.tagline && <p style={{ fontSize: "9px", color: "#444", margin: "2px 0 0" }}>{brand.settings.tagline}</p>}
      {brand.settings?.address && <p style={{ fontSize: "9px", color: "#444", margin: "4px 0 0" }}>{brand.settings.address}</p>}
      {brand.settings?.phone && <p style={{ fontSize: "9px", color: "#444", margin: 0 }}>Telp: {brand.settings.phone}</p>}
      {brand.settings?.email && <p style={{ fontSize: "9px", color: "#444", margin: 0 }}>{brand.settings.email}</p>}
    </div>
  );
}

function SectionDivider({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  const style = section.config?.style ?? "dashed";
  const borderStyle = style === "double" ? "double" : style;
  return <div style={{ borderTop: `1px ${borderStyle} #333`, margin: "6px 0" }} />;
}

function SectionCustomText({ section }: { section: ReceiptSection }) {
  if (!section.enabled || !section.config?.text) return null;
  return <p style={{ fontSize: "9px", textAlign: "center", margin: "4px 0", whiteSpace: "pre-wrap" }}>{section.config.text}</p>;
}

function SectionOrderPricing({ section, service, paymentSummary, showPrices }: { section: ReceiptSection; service: InvoiceData["service"]; paymentSummary: InvoiceData["paymentSummary"]; showPrices: boolean }) {
  if (!section.enabled) return null;
  const hasItems = service.spareparts && service.spareparts.length > 0;
  return (
    <>
      <table style={{ width: "100%", fontSize: "9px" }}>
        <tbody>
          <tr><td style={{ color: "#444", width: "30%", verticalAlign: "top" }}>No. Invoice</td><td style={{ fontWeight: 600 }}>{service.serviceNumber}</td></tr>
          <tr><td style={{ color: "#444", verticalAlign: "top" }}>Tanggal</td><td>{formatDate(service.intakeAt)}</td></tr>
          <tr><td style={{ color: "#444", verticalAlign: "top" }}>Pelanggan</td><td>{service.customerName}</td></tr>
          <tr><td style={{ color: "#444", verticalAlign: "top" }}>Perangkat</td><td>{[service.deviceBrand, service.deviceType, service.deviceModel].filter(Boolean).join(" ") || "-"}</td></tr>
          {service.deviceImei && <tr><td style={{ color: "#444", verticalAlign: "top" }}>IMEI/SN</td><td>{service.deviceImei}</td></tr>}
          <tr><td style={{ color: "#444", verticalAlign: "top" }}>Keluhan</td><td>{service.reportedIssue}</td></tr>
          {service.diagnosisResult && <tr><td style={{ color: "#444", verticalAlign: "top" }}>Diagnosa</td><td>{service.diagnosisResult}</td></tr>}
          {service.branchName && <tr><td style={{ color: "#444", verticalAlign: "top" }}>Cabang</td><td>{service.branchName}</td></tr>}
          {service.technicianName && <tr><td style={{ color: "#444", verticalAlign: "top" }}>Teknisi</td><td>{service.technicianName}</td></tr>}
        </tbody>
      </table>
      {hasItems && (
        <>
          <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
          <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #333", paddingBottom: "2px" }}>Item</th>
                <th style={{ textAlign: "center", borderBottom: "1px solid #333", paddingBottom: "2px" }}>Qty</th>
                {showPrices && <th style={{ textAlign: "right", borderBottom: "1px solid #333", paddingBottom: "2px" }}>Harga</th>}
                {showPrices && <th style={{ textAlign: "right", borderBottom: "1px solid #333", paddingBottom: "2px" }}>Subtotal</th>}
              </tr>
            </thead>
            <tbody>
              {service.spareparts.map((sp, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: "2px" }}>{sp.name}</td>
                  <td style={{ textAlign: "center", paddingTop: "2px" }}>{sp.qty}</td>
                  {showPrices && <td style={{ textAlign: "right", paddingTop: "2px" }}>{formatCurrency(sp.price)}</td>}
                  {showPrices && <td style={{ textAlign: "right", paddingTop: "2px" }}>{formatCurrency(sp.totalPrice)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {showPrices && (
        <>
          <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
          <table style={{ width: "100%", fontSize: "9px" }}>
            <tbody>
              {(() => {
                const totalBill = paymentSummary.totalBill || service.finalCost || service.estimatedCost;
                const paidAmount = paymentSummary.totalPaid;
                const remaining = paymentSummary.remaining;
                return (
                  <>
                    {totalBill > 0 && <tr><td style={{ fontWeight: 600 }}>Total Biaya</td><td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(totalBill)}</td></tr>}
                    {paidAmount > 0 && <tr><td style={{ color: "#444" }}>Terbayar</td><td style={{ textAlign: "right", color: "#444" }}>{formatCurrency(paidAmount)}</td></tr>}
                    {remaining > 0 && <tr><td style={{ fontWeight: 600, color: "#333" }}>Sisa Tagihan</td><td style={{ textAlign: "right", fontWeight: 600, color: "#333" }}>{formatCurrency(remaining)}</td></tr>}
                    {paidAmount > 0 && remaining <= 0 && <tr><td style={{ fontWeight: 600, color: "#333" }}>Status</td><td style={{ textAlign: "right", fontWeight: 600, color: "#333" }}>LUNAS</td></tr>}
                  </>
                );
              })()}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

function SectionPaymentHistory({ section, payments }: { section: ReceiptSection; payments: InvoiceData["payments"] }) {
  if (!section.enabled || payments.length === 0) return null;
  return (
    <>
      <p style={{ fontSize: "8px", fontWeight: 600, margin: "2px 0", textTransform: "uppercase", color: "#333" }}>Riwayat Pembayaran</p>
      {payments.map((p, i) => (
        <p key={i} style={{ fontSize: "8px", margin: "1px 0" }}>
          {formatDate(p.paidAt)} - {formatCurrency(p.grossAmount)}
          {p.paymentMethod ? ` (${p.paymentMethod})` : ""}
        </p>
      ))}
    </>
  );
}

function SectionQrCode({ section, qrDataUrl }: { section: ReceiptSection; qrDataUrl: string }) {
  if (!section.enabled || !qrDataUrl) return null;
  return (
    <div style={{ textAlign: "center" }}>
      <img src={qrDataUrl} alt="QR" style={{ display: "block", margin: "0 auto", width: 80, height: 80 }} />
      <p style={{ fontSize: "7px", color: "#444", margin: "2px 0 0" }}>Scan untuk tracking servis</p>
    </div>
  );
}

function SectionBarcode({ section, barcodeDataUrl, serviceNumber }: { section: ReceiptSection; barcodeDataUrl: string; serviceNumber: string }) {
  if (!section.enabled || !barcodeDataUrl) return null;
  return (
    <div style={{ textAlign: "center" }}>
      <img src={barcodeDataUrl} alt="Barcode" style={{ display: "block", margin: "0 auto", width: 160, height: 40 }} />
      <p style={{ fontSize: "7px", color: "#444", margin: "2px 0 0" }}>{serviceNumber}</p>
    </div>
  );
}

function SectionWarranty({ section, warrantyUntil }: { section: ReceiptSection; warrantyUntil: string | null }) {
  if (!section.enabled || !warrantyUntil) return null;
  return <p style={{ fontSize: "8px", textAlign: "center", color: "#333", margin: "2px 0" }}>Garansi sampai: {formatDate(warrantyUntil)}</p>;
}

function SectionFooter({ section, receiptFooter }: { section: ReceiptSection; receiptFooter: string | null | undefined }) {
  if (!section.enabled) return null;
  const text = section.config?.text || receiptFooter;
  if (!text) return null;
  return <p style={{ fontSize: "8px", textAlign: "center", color: "#333", margin: "2px 0", whiteSpace: "pre-wrap" }}>{text}</p>;
}

export function ThermalReceipt({ data, baseUrl, autoPrint, embeddedPreview = false }: ThermalReceiptProps) {
  const { service, brand, payments, paymentSummary, receiptSettings, sections } = data;
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const [barcodeDataUrl, setBarcodeDataUrl] = React.useState<string>("");
  const [printerState, setPrinterState] = React.useState<"checking" | "connected" | "disconnected">("checking");
  const [printing, setPrinting] = React.useState(false);
  const [printed, setPrinted] = React.useState(false);
  const [printError, setPrintError] = React.useState<string | null>(null);

  const trackingUrl = service.trackingToken
    ? `${baseUrl}/t/${service.trackingToken}`
    : null;

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (trackingUrl) {
        const url = await QRCode.toDataURL(trackingUrl, { width: 150, margin: 1 });
        if (!cancelled) setQrDataUrl(url);
      }
      const svg = generateBarcodeSvg(service.serviceNumber, 40);
      if (!cancelled) setBarcodeDataUrl(barcodeSvgToDataUrl(svg));
    };
    load();
    return () => { cancelled = true; };
  }, [trackingUrl, service.serviceNumber]);

  React.useEffect(() => {
    document.body.classList.add("thermal-print-mode");
    return () => document.body.classList.remove("thermal-print-mode");
  }, []);

  React.useEffect(() => {
    const syncStatus = () => setPrinterState(printerService.connected ? "connected" : "disconnected");
    printerService.on({ onStatusChange: syncStatus });
    syncStatus();
    return () => printerService.off();
  }, []);

  React.useEffect(() => {
    if (!autoPrint || printerState !== "disconnected") return;
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [autoPrint, printerState]);

  const handleDirectPrint = async () => {
    setPrinting(true);
    setPrinted(false);
    setPrintError(null);
    try {
      await printerService.printInvoice(data, baseUrl);
      setPrinted(true);
      setTimeout(() => setPrinted(false), 2500);
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "Cetak invoice gagal");
    } finally {
      setPrinting(false);
    }
  };

  const receiptFooter = brand.settings?.receiptFooter;

  const showPrices = receiptSettings.showPrices;
  const paperWidth = receiptSettings.paperWidth === "58mm" ? "58mm" : "80mm";

  const renderSection = (section: ReceiptSection) => {
    switch (section.type) {
      case "store_logo":
        return <SectionStoreLogo key={section.id} section={section} brand={brand} />;
      case "store_info":
        return <SectionStoreInfo key={section.id} section={section} brand={brand} />;
      case "divider":
        return <SectionDivider key={section.id} section={section} />;
      case "custom_text":
        return <SectionCustomText key={section.id} section={section} />;
      case "order_pricing":
        return <SectionOrderPricing key={section.id} section={section} service={service} paymentSummary={paymentSummary} showPrices={showPrices} />;
      case "payment_history":
        return <SectionPaymentHistory key={section.id} section={section} payments={payments} />;
      case "qr_code":
        return <SectionQrCode key={section.id} section={section} qrDataUrl={qrDataUrl} />;
      case "barcode":
        return <SectionBarcode key={section.id} section={section} barcodeDataUrl={barcodeDataUrl} serviceNumber={service.serviceNumber} />;
      case "warranty":
        return <SectionWarranty key={section.id} section={section} warrantyUntil={service.warrantyUntil} />;
      case "footer":
        return <SectionFooter key={section.id} section={section} receiptFooter={receiptFooter} />;
      default:
        return null;
    }
  };

  const enabledSections = sections.filter(s => s.enabled);

  const receiptMarkup = (
    <div className="receipt thermal-receipt-root mx-auto" style={{
      width: paperWidth,
      maxWidth: paperWidth,
      background: "#fff",
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: "10px",
      lineHeight: 1.4,
      padding: "8px 12px",
    }}>
      <div className="receipt-page">
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, margin: "4px 0" }}>INVOICE</p>
        </div>
        {enabledSections.map(renderSection)}
        <div style={{ borderTop: "1px dashed #333", margin: "6px 0" }} />
        <p style={{ fontSize: "7px", textAlign: "center", color: "#444", margin: "2px 0" }}>
          Invoice ini adalah bukti resmi penerimaan servis.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @page {
          size: ${paperWidth} auto;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
        }
        @media print {
          html, body {
            width: ${paperWidth} !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #111 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          script, style, noscript, [hidden] { display: none !important; }
          .no-print { display: none !important; }
          .receipt {
            display: block !important;
            visibility: visible !important;
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 8px 12px !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #111 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .receipt-page { break-inside: avoid; }
        }
        body { background: #f0f0f0; color: #111; }
      `}</style>

      {printerState === "connected" && (
        embeddedPreview ? (
          <div className="no-print mx-auto max-w-[420px] p-3">
            {receiptMarkup}
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={printing}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {printing ? <Loader2 className="size-3.5 animate-spin" /> : printed ? <Check className="size-3.5" /> : <Printer className="size-3.5" />}
              {printing ? "Mencetak..." : printed ? "Terkirim" : "Cetak ke Printer"}
            </button>
            {printError && <p className="mt-2 text-center text-xs text-destructive">{printError}</p>}
          </div>
        ) : <Popover>
          <div className="no-print flex items-center justify-center border-b bg-background/95 px-4 py-3 backdrop-blur">
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                <Printer className="size-3.5" />
                Preview & Cetak
              </button>
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-[min(92vw,420px)] p-3" align="center">
            <p className="mb-2 text-xs font-semibold">Preview Invoice</p>
            <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/20 p-2">
              {receiptMarkup}
            </div>
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={printing}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {printing ? <Loader2 className="size-3.5 animate-spin" /> : printed ? <Check className="size-3.5" /> : <Printer className="size-3.5" />}
              {printing ? "Mencetak..." : printed ? "Terkirim" : "Cetak ke Printer"}
            </button>
            {printError && <p className="mt-2 text-center text-xs text-destructive">{printError}</p>}
          </PopoverContent>
        </Popover>
      )}
      {printError && printerState === "connected" && (
        <div className="no-print mx-auto max-w-md px-4 pt-3 text-center text-xs text-destructive">
          {printError}. Gunakan Ctrl/Cmd+P untuk mencetak melalui browser.
        </div>
      )}

      {printerState !== "connected" && receiptMarkup}
    </>
  );
}
