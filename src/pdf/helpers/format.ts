export function formatRupiah(value: number | null | undefined): string {
  if (value == null) return "Rp 0";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function formatDate(value: string | null | undefined, style: "full" | "short" = "short"): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (style === "full") {
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    }
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function generatePdfDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export function generatePdfDateTime(): string {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatDuration(openedAt: string | null | undefined, closedAt: string | null | undefined): string {
  if (!openedAt) return "-";
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "-";
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days} hari` : "",
    hours > 0 ? `${hours} jam` : "",
    `${minutes} menit`,
  ].filter(Boolean);
  return parts.join(" ");
}

export function formatPaymentMethodLabel(methodType: string, methodName: string): string {
  const overrides: Record<string, string> = {
    CASH: "Tunai", TRANSFER: "Transfer", QRIS: "QRIS",
    DEBIT: "Debit", CREDIT: "Kredit", E_WALLET: "E-Wallet", OTHER: "Lainnya",
  };
  return overrides[methodType] || methodName || methodType;
}

export function formatReconciliationStatus(diff: number): { label: string; color: string } {
  if (diff === 0) return { label: "Sesuai", color: "#16a34a" };
  if (diff > 0) return { label: "Lebih", color: "#d97706" };
  return { label: "Kurang", color: "#dc2626" };
}
