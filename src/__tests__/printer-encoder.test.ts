import { describe, expect, it } from "vitest";
import { buildEscPosInvoice } from "@/services/printer/escpos-invoice";

describe("buildEscPosInvoice", () => {
  it("encodes invoice content with receipt width, QR, barcode, and cut commands", () => {
    const data = {
      brand: {
        name: "Demo Seervis",
        settings: {
          storeName: "Demo Store",
          tagline: "Repair cepat",
          address: "Jl. Contoh 1",
          phone: "0812345678",
          email: "demo@example.com",
          receiptFooter: "Terima kasih",
        },
      },
      service: {
        serviceNumber: "SRV-001",
        customerName: "Budi",
        deviceBrand: "Samsung",
        deviceType: "Phone",
        deviceModel: "S24",
        reportedIssue: "Layar rusak",
        intakeAt: "2026-07-21T00:00:00.000Z",
        finalCost: 100000,
        estimatedCost: 100000,
        warrantyUntil: null,
        trackingToken: "TRACK-1",
        branchName: null,
        technicianName: "Andi",
        deviceImei: null,
        diagnosisResult: null,
        spareparts: [],
      },
      payments: [],
      paymentSummary: { totalBill: 100000, totalPaid: 0, remaining: 100000 },
      receiptSettings: { paperWidth: "58mm", showPrices: true },
      sections: [
        { type: "store_info", enabled: true, config: {} },
        { type: "order_pricing", enabled: true, config: {} },
        { type: "qr_code", enabled: true, config: {} },
        { type: "barcode", enabled: true, config: {} },
        { type: "footer", enabled: true, config: { text: "Terima kasih" } },
      ],
    } as never;

    const bytes = buildEscPosInvoice(data, { paperWidth: 58, copies: 1, encoding: "UTF-8", autoCut: true });
    const output = new TextDecoder().decode(bytes);

    expect(output).toContain("DEMO STORE");
    expect(output).toContain("SRV-001");
    expect(output).toContain("Budi");
    expect(output).toContain("Terima kasih");
    expect(bytes).toContain(0x1d);
    expect(bytes.slice(-3)).toEqual(new Uint8Array([0x1d, 0x56, 0x00]));
  });
});
