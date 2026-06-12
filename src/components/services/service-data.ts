/**
 * service-data.ts
 * Mock data for the Services page UI mockup.
 */

import {
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Headphones,
  type LucideIcon,
} from "lucide-react";

/* ─── Types ─── */

export type ServiceStatus =
  | "masuk"
  | "diagnosa"
  | "perbaikan"
  | "qc"
  | "selesai"
  | "batal";

export type PaymentItemType = "dp" | "full" | "partial";

export interface SparepartItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  totalPrice: number;
  type: "sparepart";
}

export interface PaymentItem {
  id: string;
  type: PaymentItemType;
  amount: number;
  method: string;
  date: string;
  note?: string;
  status?: string;
}

export interface TimelineEntry {
  id: string;
  status: string;
  fromStatus?: string;
  toStatus: string;
  timestamp: string;
  note?: string;
  changedBy?: string;
  by?: string;
}

export interface ServiceNote {
  text: string;
  timestamp: string;
  by: string;
}

/* ─── Payment Types ─── */

export type ServicePaymentRecordType =
  | "DOWN_PAYMENT"
  | "PARTIAL_PAYMENT"
  | "FINAL_PAYMENT"
  | "REFUND";

export type ServicePaymentRecordStatus = "SUCCEEDED" | "VOIDED" | "REFUNDED";

export type ServicePaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";

export interface ServicePaymentRecord {
  id: string;
  serviceId: string;
  paymentType: ServicePaymentRecordType;
  amount: number;
  method: string;
  methodType: string;
  accountName: string;
  status: ServicePaymentRecordStatus;
  paidAt: string;
  note?: string;
}

export interface MockPaymentMethod {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  mdrPercentage: number;
}

export interface MockPaymentAccount {
  id: string;
  accountName: string;
  type: string;
  isCashAccount: boolean;
  currentBalance: number;
  isActive: boolean;
}

export interface ServicePaymentSummary {
  totalCharged: number;
  totalPaid: number;
  remainingBalance: number;
  dpAmount: number;
  paymentStatus: ServicePaymentStatus;
}

export interface ServiceRecord {
  id: string;
  customerId?: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  issue: string;
  diagnosis?: string;
  status: ServiceStatus;
  technician?: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string;
  spareparts: SparepartItem[];
  payments: PaymentItem[];
  timeline: TimelineEntry[];
  notes: ServiceNote[];
  deviceIcon: LucideIcon;
  pickedUpAt?: string;
  pickupName?: string;
  pickupPhone?: string;
  pickupRelation?: string;
  pickupNote?: string;
  pickedUpBy?: string;
}

export type PickupStatus = "NOT_READY" | "READY" | "PICKED_UP";

export function getPickupStatus(service: ServiceRecord): PickupStatus {
  if (service.status !== "selesai") return "NOT_READY";
  if (service.pickedUpAt) return "PICKED_UP";
  return "READY";
}

export function getPickupLabel(status: PickupStatus): string {
  switch (status) {
    case "NOT_READY": return "Belum Siap";
    case "READY": return "Siap Diambil";
    case "PICKED_UP": return "Sudah Diambil";
  }
}

export function getPickupColor(status: PickupStatus): string {
  switch (status) {
    case "NOT_READY": return "bg-gray-100 text-gray-600";
    case "READY": return "bg-green-100 text-green-700";
    case "PICKED_UP": return "bg-blue-100 text-blue-700";
  }
}

/* ─── Status labels & config ─── */

export const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; color: string; dot: string }
> = {
  masuk: {
    label: "Masuk",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  diagnosa: {
    label: "Diagnosa",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  perbaikan: {
    label: "Perbaikan",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  qc: {
    label: "QC",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  selesai: {
    label: "Selesai",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  batal: {
    label: "Batal",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export const STATUS_ORDER: ServiceStatus[] = [
  "masuk",
  "diagnosa",
  "perbaikan",
  "qc",
  "selesai",
  "batal",
];

/* ─── Technicians ─── */

export const TECHNICIANS = [
  "Andi Pratama",
  "Budi Santoso",
  "Citra Dewi",
  "Dodi Firmansyah",
  "Eka Putri",
  "Fajar Hidayat",
];

/* ─── Branches ─── */

export const BRANCHES = ["Semarang Pusat", "Salatiga", "Sragen"];

/* ─── Mock Payment Methods ─── */

export const MOCK_PAYMENT_METHODS: MockPaymentMethod[] = [
  { id: "PM-CASH", type: "CASH", name: "Tunai", isActive: true, mdrPercentage: 0 },
  { id: "PM-QRIS", type: "QRIS", name: "QRIS", isActive: true, mdrPercentage: 0.3 },
  { id: "PM-TRF", type: "TRANSFER", name: "Transfer Bank", isActive: true, mdrPercentage: 0 },
  { id: "PM-DBT", type: "DEBIT", name: "Kartu Debit", isActive: true, mdrPercentage: 1.0 },
  { id: "PM-CRD", type: "CREDIT", name: "Kartu Kredit", isActive: true, mdrPercentage: 1.5 },
  { id: "PM-EWL", type: "EWALLET", name: "E-Wallet", isActive: true, mdrPercentage: 0.5 },
];

/* ─── Mock Payment Accounts ─── */

export const MOCK_PAYMENT_ACCOUNTS: MockPaymentAccount[] = [
  { id: "PA-CASH-01", accountName: "Kas Tunai", type: "CASH", isCashAccount: true, currentBalance: 5000000, isActive: true },
  { id: "PA-QRIS-01", accountName: "QRIS BCA", type: "QRIS", isCashAccount: false, currentBalance: 0, isActive: true },
  { id: "PA-BCA-01", accountName: "BCA Giro", type: "BANK", isCashAccount: false, currentBalance: 15000000, isActive: true },
  { id: "PA-MDR-01", accountName: "Bank Mandiri", type: "BANK", isCashAccount: false, currentBalance: 8000000, isActive: true },
];


/* ─── Mock Services ─── */

export const MOCK_SERVICES: ServiceRecord[] = [
  {
    id: "SRV-1024",
    deviceType: "Smartphone",
    deviceBrand: "Apple",
    deviceModel: "iPhone 11",
    serialNumber: "F2LZQ4G8HC",
    customerName: "Rina Wijaya",
    customerPhone: "0812-3456-7890",
    customerAddress: "Jl. Pandanaran No. 45, Semarang",
    issue: "Battery cepat habis, pengisian daya lambat, dan kadang tidak terdeteksi charger. Sudah terjadi sejak 2 minggu yang lalu.",
    diagnosis:
      "Battery health 72%, perlu replacement. Port charging ada kotoran, perlu dibersihkan.",
    status: "perbaikan",
    technician: "Andi Pratama",
    branch: "Semarang Pusat",
    createdAt: "2026-06-08 10:30",
    updatedAt: "2026-06-09 14:15",
    estimatedCompletion: "2026-06-10",
    spareparts: [
      { id: "sp-1", name: "Battery iPhone 11 (Original)", qty: 1, price: 350000, totalPrice: 350000, type: "sparepart" as const },
      { id: "sp-2", name: "Flexible Charger Port", qty: 1, price: 85000, totalPrice: 85000, type: "sparepart" as const },
    ],
    payments: [
      { id: "pay-1", type: "dp" as const, amount: 100000, method: "DP Tunai", date: "2026-06-08 10:30" },
    ],
    timeline: [
      { id: "tl-1", status: "masuk", toStatus: "masuk", timestamp: "2026-06-08 10:30", note: "Unit diterima", changedBy: "Front Office" },
      { id: "tl-2", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-08 14:00", note: "Diagnosis selesai, menunggu persetujuan", changedBy: "Andi Pratama" },
      { id: "tl-3", status: "perbaikan", toStatus: "perbaikan", timestamp: "2026-06-09 09:00", note: "Sparepart tersedia, mulai perbaikan", changedBy: "Andi Pratama" },
    ],
    notes: [
      { text: "Pelanggan minta dipercepat, butuh hp untuk kerja", timestamp: "2026-06-08 11:00", by: "Front Office" },
      { text: "Battery original ready di stok", timestamp: "2026-06-09 08:30", by: "Inventory" },
    ],
    deviceIcon: Smartphone,
  },
  {
    id: "SRV-1025",
    deviceType: "Smartphone",
    deviceBrand: "Samsung",
    deviceModel: "Galaxy S22",
    customerName: "Bambang Suprapto",
    customerPhone: "0857-6543-2109",
    issue: "LCD retak di pojok kiri atas, touch kadang tidak respon di area retak",
    diagnosis: "LCD dan digitizer rusak, perlu replacement full assembly",
    status: "diagnosa",
    technician: "Budi Santoso",
    branch: "Semarang Pusat",
    createdAt: "2026-06-09 08:15",
    updatedAt: "2026-06-09 11:30",
    estimatedCompletion: "2026-06-11",
    spareparts: [
      { id: "sp-3", name: "LCD Samsung S22 Full Assembly", qty: 1, price: 1250000, totalPrice: 1250000, type: "sparepart" as const },
    ],
    payments: [],
    timeline: [
      { id: "tl-4", status: "masuk", toStatus: "masuk", timestamp: "2026-06-09 08:15", note: "Unit diterima dengan LCD retak", changedBy: "Front Office" },
      { id: "tl-5", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-09 11:30", note: "Diagnosis selesai, menunggu persetujuan biaya", changedBy: "Budi Santoso" },
    ],
    notes: [
      { text: "Pelanggan sudah diinfo estimasi biaya Rp 1.250.000", timestamp: "2026-06-09 11:35", by: "Budi Santoso" },
    ],
    deviceIcon: Smartphone,
  },
  {
    id: "SRV-1026",
    deviceType: "Laptop",
    deviceBrand: "Lenovo",
    deviceModel: "ThinkPad X1 Carbon",
    serialNumber: "PF3XK7M2",
    customerName: "Dian Permata",
    customerPhone: "0821-7890-1234",
    customerAddress: "Jl. Diponegoro No. 88, Salatiga",
    issue: "Laptop tidak mau booting, muncul blue screen setelah logo Windows",
    status: "perbaikan",
    technician: "Citra Dewi",
    branch: "Salatiga",
    createdAt: "2026-06-07 16:00",
    updatedAt: "2026-06-09 10:00",
    estimatedCompletion: "2026-06-10",
    spareparts: [
      { id: "sp-4", name: "SSD NVMe 512GB", qty: 1, price: 650000, totalPrice: 650000, type: "sparepart" as const },
    ],
    payments: [
      { id: "pay-2", type: "full" as const, amount: 650000, method: "Transfer", date: "2026-06-07 16:00" },
    ],
    timeline: [
      { id: "tl-6", status: "masuk", toStatus: "masuk", timestamp: "2026-06-07 16:00", note: "BSOD, tidak bisa masuk Windows", changedBy: "Front Office" },
      { id: "tl-7", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-08 09:00", note: "HDD bad sector, rekomendasi ganti SSD", changedBy: "Citra Dewi" },
      { id: "tl-8", status: "perbaikan", toStatus: "perbaikan", timestamp: "2026-06-08 14:00", note: "SSD baru dipasang, install OS", changedBy: "Citra Dewi" },
    ],
    notes: [
      { text: "Data sudah di-backup ke external drive", timestamp: "2026-06-08 10:00", by: "Citra Dewi" },
    ],
    deviceIcon: Laptop,
  },
  {
    id: "SRV-1027",
    deviceType: "Smartphone",
    deviceBrand: "Xiaomi",
    deviceModel: "Redmi Note 12",
    customerName: "Fajar Nugroho",
    customerPhone: "0813-4567-8901",
    issue: "Tidak bisa charging, port USB longgar",
    status: "selesai",
    technician: "Andi Pratama",
    branch: "Semarang Pusat",
    createdAt: "2026-06-05 13:00",
    updatedAt: "2026-06-09 08:00",
    spareparts: [
      { id: "sp-5", name: "Charging Port Flex Redmi Note 12", qty: 1, price: 95000, totalPrice: 95000, type: "sparepart" as const },
    ],
    payments: [
      { id: "pay-3", type: "full" as const, amount: 200000, method: "QRIS", date: "2026-06-05 13:00" },
    ],
    timeline: [
      { id: "tl-9", status: "masuk", toStatus: "masuk", timestamp: "2026-06-05 13:00", note: "Unit diterima", changedBy: "Front Office" },
      { id: "tl-10", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-05 15:00", note: "Port charging rusak, perlu ganti", changedBy: "Andi Pratama" },
      { id: "tl-11", status: "perbaikan", toStatus: "perbaikan", timestamp: "2026-06-06 10:00", note: "Penggantian port selesai", changedBy: "Andi Pratama" },
      { id: "tl-12", status: "qc", toStatus: "qc", timestamp: "2026-06-06 14:00", note: "QC lulus, charging normal", changedBy: "QC Team" },
      { id: "tl-13", status: "selesai", toStatus: "selesai", timestamp: "2026-06-09 08:00", note: "Unit diambil pelanggan", changedBy: "Front Office" },
    ],
    notes: [],
    deviceIcon: Smartphone,
  },
  {
    id: "SRV-1028",
    deviceType: "Tablet",
    deviceBrand: "Samsung",
    deviceModel: "Galaxy Tab S9",
    serialNumber: "R52K8T1P",
    customerName: "Gita Prameswari",
    customerPhone: "0819-8765-4321",
    issue: "Layar pecah di bagian tengah, touch tidak berfungsi sama sekali",
    diagnosis: "LCD dan digitizer hancur, perlu replacement total",
    status: "qc",
    technician: "Budi Santoso",
    branch: "Sragen",
    createdAt: "2026-06-03 09:00",
    updatedAt: "2026-06-09 16:00",
    estimatedCompletion: "2026-06-10",
    spareparts: [
      { id: "sp-6", name: "LCD Galaxy Tab S9 Original", qty: 1, price: 2100000, totalPrice: 2100000, type: "sparepart" as const },
    ],
    payments: [
      { id: "pay-4", type: "partial" as const, amount: 1500000, method: "Debit", date: "2026-06-03 09:00" },
    ],
    timeline: [
      { id: "tl-14", status: "masuk", toStatus: "masuk", timestamp: "2026-06-03 09:00", note: "Layar pecah parah", changedBy: "Front Office" },
      { id: "tl-15", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-03 11:00", note: "Perlu LCD baru", changedBy: "Budi Santoso" },
      { id: "tl-16", status: "perbaikan", toStatus: "perbaikan", timestamp: "2026-06-05 08:00", note: "LCD tersedia, mulai pemasangan", changedBy: "Budi Santoso" },
      { id: "tl-17", status: "perbaikan", toStatus: "perbaikan", timestamp: "2026-06-05 15:00", note: "Pemasangan selesai, tes fungsi", changedBy: "Budi Santoso" },
      { id: "tl-18", status: "qc", toStatus: "qc", timestamp: "2026-06-09 16:00", note: "QC dilakukan, menunggu hasil akhir", changedBy: "QC Team" },
    ],
    notes: [
      { text: "LCD original butuh PO, estimasi 2 hari", timestamp: "2026-06-03 11:30", by: "Inventory" },
    ],
    deviceIcon: Tablet,
  },
  {
    id: "SRV-1029",
    deviceType: "Smartphone",
    deviceBrand: "OPPO",
    deviceModel: "Reno 10",
    customerName: "Hendra Kusuma",
    customerPhone: "0856-7890-1234",
    issue: "Camera belakang blur dan tidak bisa fokus",
    status: "masuk",
    branch: "Semarang Pusat",
    createdAt: "2026-06-09 15:30",
    updatedAt: "2026-06-09 15:30",
    spareparts: [],
    payments: [],
    timeline: [
      { id: "tl-19", status: "masuk", toStatus: "masuk", timestamp: "2026-06-09 15:30", note: "Unit diterima, antrian diagnosa", changedBy: "Front Office" },
    ],
    notes: [],
    deviceIcon: Smartphone,
  },
  {
    id: "SRV-1030",
    deviceType: "Smartphone",
    deviceBrand: "Apple",
    deviceModel: "iPhone 13 Pro",
    serialNumber: "M9XC2K4L",
    customerName: "Indah Lestari",
    customerPhone: "0811-2345-6789",
    issue: "Microphone tidak berfungsa saat telepon, speaker normal",
    status: "perbaikan",
    technician: "Andi Pratama",
    branch: "Semarang Pusat",
    createdAt: "2026-06-08 11:00",
    updatedAt: "2026-06-09 13:00",
    estimatedCompletion: "2026-06-10",
    spareparts: [
      { id: "sp-7", name: "Bottom Mic Flex iPhone 13 Pro", qty: 1, price: 120000, totalPrice: 120000, type: "sparepart" as const },
    ],
    payments: [],
    timeline: [
      { id: "tl-20", status: "masuk", toStatus: "masuk", timestamp: "2026-06-08 11:00", note: "Unit diterima", changedBy: "Front Office" },
      { id: "tl-21", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-08 16:00", note: "Bottom mic flex rusak", changedBy: "Andi Pratama" },
      { id: "tl-22", status: "perbaikan", toStatus: "perbaikan", timestamp: "2026-06-09 13:00", note: "Sparepart tersedia, perbaikan dimulai", changedBy: "Andi Pratama" },
    ],
    notes: [],
    deviceIcon: Smartphone,
  },
  {
    id: "SRV-1031",
    deviceType: "Laptop",
    deviceBrand: "Asus",
    deviceModel: "Vivobook 15",
    customerName: "Joko Widodo",
    customerPhone: "0822-3456-7890",
    issue: "Keyboard beberapa tombol tidak berfungsi (A, S, D, space)",
    status: "masuk",
    branch: "Salatiga",
    createdAt: "2026-06-09 14:00",
    updatedAt: "2026-06-09 14:00",
    spareparts: [],
    payments: [],
    timeline: [
      { id: "tl-23", status: "masuk", toStatus: "masuk", timestamp: "2026-06-09 14:00", note: "Unit diterima, diagnosa menunggu", changedBy: "Front Office" },
    ],
    notes: [],
    deviceIcon: Laptop,
  },
  {
    id: "SRV-1032",
    deviceType: "Smartphone",
    deviceBrand: "Samsung",
    deviceModel: "Galaxy A54",
    customerName: "Kartika Sari",
    customerPhone: "0815-6789-0123",
    issue: "HP sering restart sendiri, terutama saat buka kamera",
    diagnosis: "Main IC power mulai lemah, perlu reballing atau ganti IC",
    status: "diagnosa",
    technician: "Budi Santoso",
    branch: "Sragen",
    createdAt: "2026-06-08 10:00",
    updatedAt: "2026-06-09 09:30",
    estimatedCompletion: "2026-06-12",
    spareparts: [],
    payments: [],
    timeline: [
      { id: "tl-24", status: "masuk", toStatus: "masuk", timestamp: "2026-06-08 10:00", note: "HP restar sendiri", changedBy: "Front Office" },
      { id: "tl-25", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-09 09:30", note: "IC power bermasalah, estimasi biaya Rp 350.000", changedBy: "Budi Santoso" },
    ],
    notes: [
      { text: "Menunggu persetujuan biaya dari pelanggan", timestamp: "2026-06-09 09:35", by: "Budi Santoso" },
    ],
    deviceIcon: Smartphone,
  },
  {
    id: "SRV-1033",
    deviceType: "Headphones",
    deviceBrand: "Sony",
    deviceModel: "WH-1000XM5",
    customerName: "Luna Maharani",
    customerPhone: "0817-8901-2345",
    issue: "Noise cancelling tidak aktif, LED indikator mati",
    diagnosis: "Kerusakan pada board NC, tidak ada tegangan masuk ke modul NC",
    status: "batal",
    technician: "Citra Dewi",
    branch: "Semarang Pusat",
    createdAt: "2026-06-01 13:00",
    updatedAt: "2026-06-05 10:00",
    spareparts: [],
    payments: [],
    timeline: [
      { id: "tl-26", status: "masuk", toStatus: "masuk", timestamp: "2026-06-01 13:00", note: "Unit diterima", changedBy: "Front Office" },
      { id: "tl-27", status: "diagnosa", toStatus: "diagnosa", timestamp: "2026-06-03 10:00", note: "Board NC rusak, sparepart tidak tersedia", changedBy: "Citra Dewi" },
      { id: "tl-28", status: "batal", toStatus: "batal", timestamp: "2026-06-05 10:00", note: "Sparepart tidak tersedia, servis dibatalkan", changedBy: "Citra Dewi" },
    ],
    notes: [
      { text: "Sparepart NC board Sony XM5 sedang PO dari distributor", timestamp: "2026-06-03 11:00", by: "Inventory" },
      { text: "Pelanggan memilih batal karena tidak mau menunggu", timestamp: "2026-06-05 10:00", by: "Front Office" },
    ],
    deviceIcon: Headphones,
  },
];

/* ─── Helpers ─── */

export function getStatusLabel(status: ServiceStatus): string {
  return STATUS_CONFIG[status].label;
}

export function getStatusColor(status: ServiceStatus): string {
  return STATUS_CONFIG[status].color;
}

export function getStatusDot(status: ServiceStatus): string {
  return STATUS_CONFIG[status].dot;
}

export function formatCurrency(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ─── Payment Helpers ─── */

export function getPaymentTypeLabel(type: ServicePaymentRecordType): string {
  switch (type) {
    case "DOWN_PAYMENT": return "DP";
    case "PARTIAL_PAYMENT": return "Pembayaran Sebagian";
    case "FINAL_PAYMENT": return "Pelunasan";
    case "REFUND": return "Refund";
    default: return type;
  }
}

export function getPaymentStatusLabel(status: ServicePaymentStatus): { label: string; color: string; textColor: string } {
  switch (status) {
    case "UNPAID":
      return { label: "Belum Dibayar", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", textColor: "text-gray-600 dark:text-gray-400" };
    case "PARTIAL":
      return { label: "DP / Sebagian", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", textColor: "text-amber-600 dark:text-amber-400" };
    case "PAID":
      return { label: "Lunas", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", textColor: "text-emerald-600 dark:text-emerald-400" };
    case "OVERPAID":
      return { label: "Kelebihan Bayar", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", textColor: "text-red-600 dark:text-red-400" };
    default: return { label: status, color: "", textColor: "" };
  }
}

export function calculateServicePaymentSummary(
  totalCharged: number,
  paymentRecords: ServicePaymentRecord[],
): ServicePaymentSummary {
  let totalPaid = 0;
  for (const p of paymentRecords) {
    if (p.status === "SUCCEEDED") {
      if (p.paymentType === "REFUND") {
        totalPaid -= p.amount;
      } else {
        totalPaid += p.amount;
      }
    }
  }

  const remainingBalance = Math.max(0, totalCharged - totalPaid);

  let paymentStatus: ServicePaymentStatus;
  if (totalPaid <= 0) {
    paymentStatus = "UNPAID";
  } else if (totalPaid < totalCharged) {
    paymentStatus = "PARTIAL";
  } else if (totalPaid === totalCharged) {
    paymentStatus = "PAID";
  } else {
    paymentStatus = "OVERPAID";
  }

  return { totalCharged, totalPaid, remainingBalance, dpAmount: 0, paymentStatus };
}

export function getPaymentRecordTypeLabel(type: ServicePaymentRecordType): string {
  switch (type) {
    case "DOWN_PAYMENT": return "DP";
    case "PARTIAL_PAYMENT": return "Sebagian";
    case "FINAL_PAYMENT": return "Pelunasan";
    case "REFUND": return "Refund";
  }
}

export function generatePaymentId(): string {
  return "PAY-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function getDefaultPaymentAccountForMethod(methodId: string): string | undefined {
  // Return the first matching active account for a given payment method
  const method = MOCK_PAYMENT_METHODS.find(m => m.id === methodId);
  if (!method) return undefined;

  // CASH methods -> use Kas Tunai
  if (method.type === "CASH") return "PA-CASH-01";
  // QRIS methods -> use QRIS BCA
  if (method.type === "QRIS") return "PA-QRIS-01";
  // BANK/TRANSFER -> use BCA Giro
  if (method.type === "TRANSFER" || method.type === "BANK") return "PA-BCA-01";
  // DEBIT/CREDIT/EWALLET -> use Mandiri
  return "PA-MDR-01";
}

export function getPaymentAccountName(accountId: string): string {
  const account = MOCK_PAYMENT_ACCOUNTS.find(a => a.id === accountId);
  return account?.accountName ?? accountId;
}

export function getPaymentMethodName(methodId: string): string {
  const method = MOCK_PAYMENT_METHODS.find(m => m.id === methodId);
  return method?.name ?? methodId;
}


export function getTotalSparepartCost(items: SparepartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function getTotalPayment(items: PaymentItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export interface ServiceTrendData {
  date: string;
  inProgress: number;
  completed: number;
}

export function generateTrendData(): ServiceTrendData[] {
  const baseInProgress = [7, 9, 8, 11, 10, 13, 12, 15, 14, 16, 15, 18, 17, 19];
  const baseCompleted = [3, 4, 5, 4, 6, 5, 7, 8, 7, 9, 8, 10, 11, 10];
  const today = new Date();

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));

    return {
      date: date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
      }),
      inProgress: baseInProgress[index],
      completed: baseCompleted[index],
    };
  });
}
