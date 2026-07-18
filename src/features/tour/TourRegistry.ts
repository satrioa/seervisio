import type { TourDef, TourStepDef } from "./tour.types";

/**
 * Tour Registry.
 *
 * Never hardcode raw CSS selectors. Every step references a
 * `data-tour="<id>"` attribute exposed by a guided component.
 *
 * Each step declares:
 *  - id          stable id for progress tracking
 *  - selector   the data-tour value used to locate the DOM target
 *  - title / description
 *  - placement  popover side (auto-calculated if not specified)
 *  - module      which module owns the step
 *  - permission required role to see/perform the step
 *  - requiredAction (optional) business event that must fire before advancing
 *  - autoOpenDialog (optional) auto-open dialog before highlighting
 *  - autoExpandAccordion (optional) auto-expand accordion/tabs before highlighting
 */

// ── Dashboard tour (v1) ──────────────────────────────────────────────
// Onboarding flow: introduce the interface, then guide the user to
// create a branch, a technician account, and their first service.
const dashboardV1Steps: TourStepDef[] = [
  {
    id: "dashboard-overview",
    selector: "dashboard-overview",
    title: "Selamat datang di Dashboard",
    description:
      "Ini ringkasan performa bisnis Anda — pendapatan, servis aktif, dan inventaris. Kita akan pandu 3 langkah cepat untuk siap beroperasi.",
    placement: "bottom",
    module: "dashboard",
    permission: "MASTER_ADMIN",
  },
  {
    id: "sidebar-nav",
    selector: "sidebar-nav",
    title: "Navigasi Utama",
    description:
      "Semua modul — Cabang, Akun, Servis, POS, Inventaris — ada di menu ini. Klik 'Berikut' untuk membuka halaman Cabang.",
    placement: "right",
    module: "dashboard",
    permission: "MASTER_ADMIN",
    route: "/panel/branches",
  },
  {
    id: "branch-create",
    selector: "branch-create",
    title: "Langkah 1 · Buat Cabang",
    description:
      "Klik 'Tambah Cabang'. Isi nama & kode cabang, lalu simpan.",
    placement: "bottom",
    module: "dashboard",
    permission: "MASTER_ADMIN",
    requiredAction: "branch-created",
    route: "/panel/branches",
    autoOpenDialog: true,
  },
  {
    id: "account-technician-create",
    selector: "account-create",
    title: "Langkah 2 · Buat Akun Teknisi",
    description:
      "Buka halaman Akun, klik 'Tambah User', pilih role Teknisi, dan berikan akses cabang tadi.",
    placement: "bottom",
    module: "dashboard",
    permission: "MASTER_ADMIN",
    requiredAction: "user-created",
    route: "/panel/accounts",
    autoOpenDialog: true,
  },
  {
    id: "new-service",
    selector: "new-service",
    title: "Langkah 3 · Buat Data Servis",
    description:
      "Sekarang buat servis pertama Anda. Klik 'Buat Servis Baru', isi data perangkat & pelanggan, lalu simpan.",
    placement: "bottom",
    module: "service",
    permission: "MASTER_ADMIN",
    requiredAction: "service-created",
    route: "/panel/services",
    autoOpenDialog: true,
  },
];

// ── Checkout tour (v1) ───────────────────────────────────────────────
const checkoutV1Steps: TourStepDef[] = [
  {
    id: "checkout-package",
    selector: "checkout-package",
    title: "Pilih Paket",
    description: "Pilih paket yang sesuai dengan kebutuhan bisnis Anda.",
    placement: "bottom",
    module: "checkout",
    permission: "MASTER_ADMIN",
  },
  {
    id: "checkout-payment",
    selector: "checkout-payment",
    title: "Metode Pembayaran",
    description: "Pilih metode pembayaran yang tersedia.",
    placement: "bottom",
    module: "checkout",
    permission: "MASTER_ADMIN",
  },
  {
    id: "checkout-coupon",
    selector: "checkout-coupon",
    title: "Kode Kupon",
    description: "Punya kode kupon? Masukkan di sini untuk diskon.",
    placement: "top",
    module: "checkout",
    permission: "MASTER_ADMIN",
  },
  {
    id: "checkout-button",
    selector: "checkout-button",
    title: "Konfirmasi Pembayaran",
    description: "Klik untuk menyelesaikan pesanan Anda.",
    placement: "top",
    module: "checkout",
    permission: "MASTER_ADMIN",
    requiredAction: "license-payment-created",
  },
];

// ── Inventory tour (v1) ──────────────────────────────────────────────
const inventoryV1Steps: TourStepDef[] = [
  {
    id: "inventory-import",
    selector: "inventory-import",
    title: "Impor Inventaris",
    description: "Impor stok massal menggunakan file Excel.",
    placement: "bottom",
    module: "inventory",
    permission: "MASTER_ADMIN",
    autoOpenDialog: true,
  },
  {
    id: "inventory-add",
    selector: "inventory-add",
    title: "Tambah Produk",
    description: "Tambah produk atau sparepart baru ke inventaris.",
    placement: "bottom",
    module: "inventory",
    permission: "MASTER_ADMIN",
    autoOpenDialog: true,
  },
];

// ── Payment account tour (v1) ───────────────────────────────────────
const paymentAccountV1Steps: TourStepDef[] = [
  {
    id: "payment-account-add",
    selector: "payment-account-add",
    title: "Tambah Akun Pembayaran",
    description: "Tambahkan rekening perusahaan untuk menerima pembayaran.",
    placement: "bottom",
    module: "finance",
    permission: "MASTER_ADMIN",
    requiredAction: "payment-account-created",
    autoOpenDialog: true,
  },
];

export const TOUR_REGISTRY: Record<string, TourDef> = {
  "dashboard-v1": {
    id: "dashboard-v1",
    name: "Dashboard Tour",
    version: 1,
    module: "dashboard",
    steps: dashboardV1Steps,
  },
  "checkout-v1": {
    id: "checkout-v1",
    name: "Checkout Tour",
    version: 1,
    module: "checkout",
    steps: checkoutV1Steps,
  },
  "inventory-v1": {
    id: "inventory-v1",
    name: "Inventory Tour",
    version: 1,
    module: "inventory",
    steps: inventoryV1Steps,
  },
  "finance-v1": {
    id: "finance-v1",
    name: "Finance Setup Tour",
    version: 1,
    module: "finance",
    steps: paymentAccountV1Steps,
  },
};

export function getTour(name: string): TourDef | null {
  return TOUR_REGISTRY[name] ?? null;
}

export function getToursForModule(module: string): TourDef[] {
  return Object.values(TOUR_REGISTRY).filter((t) => t.module === module);
}
