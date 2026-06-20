import {
  SERVICE_STATUS_LABELS,
  STATUS_ORDER as SERVICE_STATUS_ORDER,
  type DeviceIconKey,
  type ServiceDbStatus,
  type ServiceUiStatus,
} from "@/lib/services/service-status";

export type ServiceStatus = ServiceUiStatus;

export type PaymentItemType = "dp" | "full" | "partial";

export interface SparepartItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  totalPrice: number;
  type: "sparepart";
  // Snapshot data
  itemNameSnapshot?: string | null;
  variantSnapshot?: Record<string, any> | null;
  skuSnapshot?: string | null;
  barcodeSnapshot?: string | null;
  serializedUnitId?: string | null;
  imeiSnapshot?: string | null;
  serialNumberSnapshot?: string | null;
  batteryHealthSnapshot?: number | null;
  conditionGradeSnapshot?: string | null;
  conditionNotesSnapshot?: string | null;
  unitSnapshot?: string | null;
  unitCostSnapshot?: number | null;
  sellingPriceSnapshot?: number | null;
  totalCostSnapshot?: number | null;
  totalPriceSnapshot?: number | null;
  isReturned?: boolean;
  serializedUnit?: {
    id: string;
    imei: string | null;
    serialNumber: string | null;
    batteryHealth: number | null;
    conditionGrade: string | null;
    conditionNotes: string | null;
    status: string;
  } | null;
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

export interface ServiceUiItem {
  id: string;
  serviceNumber: string;
  rawStatus: ServiceDbStatus;
  status: ServiceUiStatus;
  statusLabel: string;
  brandId: number;
  branchId: string;
  branchName: string | null;
  customerId: string | null;
  customerName: string;
  deviceType: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceName: string;
  deviceIconKey: DeviceIconKey;
  issue: string;
  estimatedCost: number;
  finalCost: number;
  assignedTechnicianId: string | null;
  technicianName: string | null;
  intakeAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord extends ServiceUiItem {
  serialNumber?: string;
  customerPhone: string;
  customerAddress?: string;
  diagnosis?: string;
  technician?: string;
  branch: string;
  estimatedCompletion?: string;
  spareparts: SparepartItem[];
  payments: PaymentItem[];
  timeline: TimelineEntry[];
  notes: ServiceNote[];
  pickedUpAt?: string;
  pickupName?: string;
  pickupPhone?: string;
  pickupRelation?: string;
  pickupNote?: string;
  pickedUpBy?: string;
  paymentSummary?: ServicePaymentSummary;
}

export type PickupStatus = "NOT_READY" | "READY" | "PICKED_UP";

export function getPickupStatus(service: Pick<ServiceUiItem, "status"> & { pickedUpAt?: string }): PickupStatus {
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

export const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; color: string; dot: string }
> = {
  masuk: {
    label: SERVICE_STATUS_LABELS.masuk,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  diagnosa: {
    label: SERVICE_STATUS_LABELS.diagnosa,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  menunggu_persetujuan: {
    label: SERVICE_STATUS_LABELS.menunggu_persetujuan,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  perbaikan: {
    label: SERVICE_STATUS_LABELS.perbaikan,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  qc: {
    label: SERVICE_STATUS_LABELS.qc,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  selesai: {
    label: SERVICE_STATUS_LABELS.selesai,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: SERVICE_STATUS_LABELS.cancelled,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export const STATUS_ORDER: ServiceStatus[] = SERVICE_STATUS_ORDER;

export const MOCK_PAYMENT_METHODS: MockPaymentMethod[] = [
  { id: "PM-CASH", type: "CASH", name: "Tunai", isActive: true, mdrPercentage: 0 },
  { id: "PM-QRIS", type: "QRIS", name: "QRIS", isActive: true, mdrPercentage: 0.3 },
  { id: "PM-TRF", type: "TRANSFER", name: "Transfer Bank", isActive: true, mdrPercentage: 0 },
  { id: "PM-DBT", type: "DEBIT", name: "Kartu Debit", isActive: true, mdrPercentage: 1.0 },
  { id: "PM-CRD", type: "CREDIT", name: "Kartu Kredit", isActive: true, mdrPercentage: 1.5 },
  { id: "PM-EWL", type: "EWALLET", name: "E-Wallet", isActive: true, mdrPercentage: 0.5 },
];

export const MOCK_PAYMENT_ACCOUNTS: MockPaymentAccount[] = [
  { id: "PA-CASH-01", accountName: "Kas Tunai", type: "CASH", isCashAccount: true, currentBalance: 5000000, isActive: true },
  { id: "PA-QRIS-01", accountName: "QRIS BCA", type: "QRIS", isCashAccount: false, currentBalance: 0, isActive: true },
  { id: "PA-BCA-01", accountName: "BCA Giro", type: "BANK", isCashAccount: false, currentBalance: 15000000, isActive: true },
  { id: "PA-MDR-01", accountName: "Bank Mandiri", type: "BANK", isCashAccount: false, currentBalance: 8000000, isActive: true },
];

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
      return { label: "Belum dibayar", color: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300", textColor: "text-gray-600 dark:text-gray-300" };
    case "PARTIAL":
      return { label: "Belum Lunas", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", textColor: "text-amber-600 dark:text-amber-400" };
    case "PAID":
      return { label: "Sudah Lunas", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", textColor: "text-emerald-600 dark:text-emerald-400" };
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
      totalPaid += p.paymentType === "REFUND" ? -p.amount : p.amount;
    }
  }

  const remainingBalance = Math.max(0, totalCharged - totalPaid);
  let paymentStatus: ServicePaymentStatus;
  if (totalPaid <= 0) paymentStatus = "UNPAID";
  else if (totalPaid < totalCharged) paymentStatus = "PARTIAL";
  else if (totalPaid === totalCharged) paymentStatus = "PAID";
  else paymentStatus = "OVERPAID";

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
  const method = MOCK_PAYMENT_METHODS.find(m => m.id === methodId);
  if (!method) return undefined;
  if (method.type === "CASH") return "PA-CASH-01";
  if (method.type === "QRIS") return "PA-QRIS-01";
  if (method.type === "TRANSFER" || method.type === "BANK") return "PA-BCA-01";
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
  return [];
}
