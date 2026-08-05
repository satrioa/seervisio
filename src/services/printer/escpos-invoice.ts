"use client";

import type { InvoiceData } from "@/server/actions/invoice-data.actions";
import type { PaperWidth, PrinterSettings } from "./printer-types";

type ReceiptSectionLike = {
  type: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

type InvoicePrintData = InvoiceData & { sections: ReceiptSectionLike[] };

const ESC = 0x1b;
const GS = 0x1d;

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function command(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

function text(value: string, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`${value.replace(/\r?\n/g, "\n")}\n`);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
}

function center(value: string, columns: number): string {
  const clipped = value.slice(0, columns);
  const left = Math.max(0, Math.floor((columns - clipped.length) / 2));
  return `${" ".repeat(left)}${clipped}`;
}

function separator(columns: number): string {
  return "-".repeat(columns);
}

function qrCode(data: string, size = 6): Uint8Array {
  const payload = new TextEncoder().encode(data);
  const storeLength = payload.length + 3;
  return concatBytes(
    command(GS, 0x28, 0x6b, 4, 0, 0x31, 0x41, 0x32, 0),
    command(GS, 0x28, 0x6b, 3, 0, 0x31, 0x43, size),
    command(GS, 0x28, 0x6b, 3, 0, 0x31, 0x45, 0x30),
    command(GS, 0x28, 0x6b, storeLength & 0xff, (storeLength >> 8) & 0xff, 0x31, 0x50, 0x30),
    payload,
    command(GS, 0x28, 0x6b, 3, 0, 0x31, 0x51, 0x30),
  );
}

function barcode(value: string): Uint8Array {
  const payload = new TextEncoder().encode(`{B${value}`);
  return concatBytes(
    command(GS, 0x68, 50),
    command(GS, 0x77, 2),
    command(GS, 0x6b, 73, payload.length),
    payload,
    command(0x0a),
  );
}

function enabled(sections: ReceiptSectionLike[], type: string): boolean {
  return sections.some((section) => section.type === type && section.enabled);
}

export function buildEscPosInvoice(
  data: InvoicePrintData,
  settings: Pick<PrinterSettings, "paperWidth" | "copies" | "encoding" | "autoCut">,
  baseUrl?: string,
): Uint8Array {
  const encoder = new TextEncoder();
  const columns = settings.paperWidth === (80 as PaperWidth) ? 48 : 32;
  const chunks: Uint8Array[] = [command(ESC, 0x40)];
  const sections = data.sections ?? [];
  const store = data.brand.settings;
  const storeName = store?.storeName || data.brand.name;
  const trackingUrl = data.service.trackingToken
    ? `${baseUrl ?? ""}/t/${data.service.trackingToken}`
    : "";

  const add = (...parts: Uint8Array[]) => chunks.push(...parts);
  const centerAlign = () => add(command(ESC, 0x61, 1));
  const leftAlign = () => add(command(ESC, 0x61, 0));

  if (enabled(sections, "store_logo")) {
    centerAlign();
    add(text("INVOICE", encoder));
  }
  if (enabled(sections, "store_info")) {
    centerAlign();
    add(text(storeName.toUpperCase(), encoder));
    if (store?.tagline) add(text(store.tagline, encoder));
    if (store?.address) add(text(store.address, encoder));
    if (store?.phone) add(text(`Telp: ${store.phone}`, encoder));
    if (store?.email) add(text(store.email, encoder));
  }

  if (enabled(sections, "divider")) add(text(separator(columns), encoder));
  if (enabled(sections, "order_pricing")) {
    leftAlign();
    add(
      text(`No. Invoice : ${data.service.serviceNumber}`, encoder),
      text(`Tanggal     : ${formatDate(data.service.intakeAt)}`, encoder),
      text(`Pelanggan   : ${data.service.customerName}`, encoder),
      text(`Perangkat   : ${[data.service.deviceBrand, data.service.deviceType, data.service.deviceModel].filter(Boolean).join(" ") || "-"}`, encoder),
      text(`Keluhan     : ${data.service.reportedIssue}`, encoder),
    );
    if (data.service.branchName) add(text(`Cabang      : ${data.service.branchName}`, encoder));
    if (data.service.technicianName) add(text(`Teknisi     : ${data.service.technicianName}`, encoder));

    if (data.service.spareparts?.length) {
      add(text(separator(columns), encoder));
      for (const item of data.service.spareparts) {
        add(text(`${item.name} x${item.qty}`, encoder));
        if (data.receiptSettings.showPrices) add(text(`  ${formatCurrency(item.totalPrice)}`, encoder));
      }
    }

    if (data.receiptSettings.showPrices) {
      add(text(separator(columns), encoder));
      const total = data.paymentSummary.totalBill || data.service.finalCost || data.service.estimatedCost;
      add(text(`Total Biaya : ${formatCurrency(total)}`, encoder));
      if (data.paymentSummary.totalPaid > 0) add(text(`Terbayar    : ${formatCurrency(data.paymentSummary.totalPaid)}`, encoder));
      if (data.paymentSummary.remaining > 0) add(text(`Sisa Tagihan: ${formatCurrency(data.paymentSummary.remaining)}`, encoder));
      if (data.paymentSummary.totalPaid > 0 && data.paymentSummary.remaining <= 0) add(text("Status      : LUNAS", encoder));
    }
  }

  if (enabled(sections, "payment_history") && data.payments.length > 0) {
    leftAlign();
    add(text(separator(columns), encoder), text("RIWAYAT PEMBAYARAN", encoder));
    for (const payment of data.payments) add(text(`${formatDate(payment.paidAt)} - ${formatCurrency(payment.grossAmount)}`, encoder));
  }

  if (enabled(sections, "qr_code") && trackingUrl) {
    centerAlign();
    add(qrCode(trackingUrl), text("Scan untuk tracking servis", encoder));
  }
  if (enabled(sections, "barcode")) {
    centerAlign();
    add(barcode(data.service.serviceNumber), text(data.service.serviceNumber, encoder));
  }
  if (enabled(sections, "warranty") && data.service.warrantyUntil) {
    centerAlign();
    add(text(`Garansi sampai: ${formatDate(data.service.warrantyUntil)}`, encoder));
  }
  if (enabled(sections, "footer")) {
    const footer = sections.find((section) => section.type === "footer")?.config?.text || store?.receiptFooter;
    if (typeof footer === "string" && footer) {
      centerAlign();
      add(text(footer.slice(0, 50), encoder));
    }
  }

  centerAlign();
  add(text("Invoice ini adalah bukti resmi penerimaan servis.", encoder), text("\n", encoder));
  if (settings.autoCut) add(command(GS, 0x56, 0));

  const result = concatBytes(...chunks);
  return settings.copies > 1 ? concatBytes(...Array.from({ length: settings.copies }, () => result)) : result;
}
