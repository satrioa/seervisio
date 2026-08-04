export type ReceiptSectionType =
  | "store_logo"
  | "store_info"
  | "divider"
  | "custom_text"
  | "order_pricing"
  | "payment_history"
  | "qr_code"
  | "barcode"
  | "warranty"
  | "footer";

export interface ReceiptSection {
  id: string;
  type: ReceiptSectionType;
  label: string;
  enabled: boolean;
  locked: boolean;
  config: Record<string, any>;
}

export const SECTION_META: Record<ReceiptSectionType, { label: string; description: string; locked: boolean }> = {
  store_logo: {
    label: "Logo Toko",
    description: "Upload logo toko (maks 200x60px)",
    locked: false,
  },
  store_info: {
    label: "Info Toko",
    description: "Nama toko, alamat, dan kontak",
    locked: false,
  },
  divider: {
    label: "Garis Pembatas",
    description: "Garis putus-putus sebagai pemisah",
    locked: false,
  },
  custom_text: {
    label: "Teks Kustom",
    description: "Teks bebas yang bisa diedit",
    locked: false,
  },
  order_pricing: {
    label: "Rincian Order, Item & Pembayaran",
    description: "Informasi order, daftar item, total biaya, dan status pembayaran",
    locked: true,
  },
  payment_history: {
    label: "Riwayat Pembayaran",
    description: "Daftar pembayaran yang sudah dilakukan",
    locked: false,
  },
  qr_code: {
    label: "QR Code",
    description: "Kode QR untuk tracking servis",
    locked: false,
  },
  barcode: {
    label: "Barcode",
    description: "Barcode nomor servis untuk scan saat pickup",
    locked: false,
  },
  warranty: {
    label: "Garansi",
    description: "Informasi masa garansi",
    locked: false,
  },
  footer: {
    label: "Footer",
    description: "Teks footer pada bagian bawah nota",
    locked: false,
  },
};

let counter = 0;
function uid(type: string): string {
  counter++;
  return `${type}-${counter}-${Date.now().toString(36)}`;
}

const VALID_TYPES = new Set<string>([
  "store_logo", "store_info", "divider", "custom_text", "order_pricing",
  "payment_history", "qr_code", "barcode", "warranty", "footer",
]);
const DEPRECATED_TYPES = new Set<string>(["order_info", "spareparts", "pricing", "store_header"]);

export function migrateReceiptSections(stored: ReceiptSection[] | null): ReceiptSection[] {
  if (!stored || stored.length === 0) return createDefaultSections();

  const cleaned: ReceiptSection[] = [];
  let hasOrderPricing = false;
  let mergedEnabled = true;
  let hasStoreHeader = false;

  for (const s of stored) {
    if (DEPRECATED_TYPES.has(String(s.type))) {
      if (!hasOrderPricing) {
        mergedEnabled = s.enabled;
      } else {
        mergedEnabled = mergedEnabled || s.enabled;
      }
      hasOrderPricing = true;
      if (String(s.type) === "store_header") hasStoreHeader = true;
      continue;
    }
    if (s.type === "order_pricing") {
      hasOrderPricing = true;
      mergedEnabled = s.enabled;
    }
    if (VALID_TYPES.has(String(s.type))) {
      cleaned.push({ ...s, type: s.type as ReceiptSectionType });
    }
  }

  if (hasStoreHeader) {
    const storeLogoMeta = SECTION_META.store_logo;
    const storeInfoMeta = SECTION_META.store_info;
    cleaned.push(
      { id: uid("store_logo"), type: "store_logo", label: storeLogoMeta.label, enabled: mergedEnabled, locked: false, config: {} },
      { id: uid("store_info"), type: "store_info", label: storeInfoMeta.label, enabled: mergedEnabled, locked: false, config: {} },
    );
  }

  if (hasOrderPricing && !cleaned.some((s) => s.type === "order_pricing")) {
    const meta = SECTION_META.order_pricing;
    cleaned.push({
      id: uid("order_pricing"),
      type: "order_pricing",
      label: meta.label,
      enabled: mergedEnabled,
      locked: true,
      config: {},
    });
  }

  if (!cleaned.some((s) => s.type === "order_pricing")) {
    const meta = SECTION_META.order_pricing;
    cleaned.splice(
      cleaned.findIndex((s) => s.type === "divider") >= 0
        ? cleaned.findIndex((s) => s.type === "divider") + 1
        : 0,
      0,
      { id: uid("order_pricing"), type: "order_pricing", label: meta.label, enabled: true, locked: true, config: {} }
    );
  }

  return cleaned;
}

export function createDefaultSections(): ReceiptSection[] {
  counter = 0;
  return [
    { id: uid("store_logo"), type: "store_logo", label: "Logo Toko", enabled: true, locked: false, config: {} },
    { id: uid("store_info"), type: "store_info", label: "Info Toko", enabled: true, locked: false, config: {} },
    { id: uid("divider"), type: "divider", label: "Garis Pembatas", enabled: true, locked: false, config: {} },
    { id: uid("order_pricing"), type: "order_pricing", label: "Rincian Order, Item & Pembayaran", enabled: true, locked: true, config: {} },
    { id: uid("divider"), type: "divider", label: "Garis Pembatas", enabled: true, locked: false, config: {} },
    { id: uid("payment_history"), type: "payment_history", label: "Riwayat Pembayaran", enabled: true, locked: false, config: {} },
    { id: uid("divider"), type: "divider", label: "Garis Pembatas", enabled: true, locked: false, config: {} },
    { id: uid("qr_code"), type: "qr_code", label: "QR Code", enabled: true, locked: false, config: {} },
    { id: uid("barcode"), type: "barcode", label: "Barcode", enabled: true, locked: false, config: {} },
    { id: uid("divider"), type: "divider", label: "Garis Pembatas", enabled: true, locked: false, config: {} },
    { id: uid("warranty"), type: "warranty", label: "Garansi", enabled: true, locked: false, config: {} },
    { id: uid("divider"), type: "divider", label: "Garis Pembatas", enabled: true, locked: false, config: {} },
    { id: uid("footer"), type: "footer", label: "Footer", enabled: true, locked: false, config: {} },
  ];
}
