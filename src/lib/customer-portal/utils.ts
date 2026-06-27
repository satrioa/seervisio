export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  INTAKE: "Diterima",
  DIAGNOSIS: "Diagnosa",
  WAITING_APPROVAL: "Menunggu Persetujuan",
  REPAIRING: "Perbaikan",
  QC: "Quality Control",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const STATUS_COLORS: Record<string, string> = {
  INTAKE: "#3B82F6",
  DIAGNOSIS: "#8B5CF6",
  WAITING_APPROVAL: "#F59E0B",
  REPAIRING: "#F97316",
  QC: "#06B6D4",
  DONE: "#10B981",
  CANCELLED: "#EF4444",
};

export const STATUS_ORDER = ["INTAKE", "DIAGNOSIS", "WAITING_APPROVAL", "REPAIRING", "QC", "DONE"];
