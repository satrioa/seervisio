export type ServiceDbStatus =
  | "INTAKE"
  | "DIAGNOSIS"
  | "WAITING_APPROVAL"
  | "REPAIRING"
  | "QC"
  | "DONE"
  | "CANCELLED";

export type ServiceUiStatus =
  | "masuk"
  | "diagnosa"
  | "menunggu_persetujuan"
  | "perbaikan"
  | "qc"
  | "selesai"
  | "cancelled";

export function mapDbStatusToUI(status?: string | null): ServiceUiStatus {
  switch ((status ?? "").toUpperCase()) {
    case "INTAKE":
      return "masuk";
    case "DIAGNOSIS":
      return "diagnosa";
    case "WAITING_APPROVAL":
      return "menunggu_persetujuan";
    case "REPAIRING":
      return "perbaikan";
    case "QC":
      return "qc";
    case "DONE":
      return "selesai";
    case "CANCELLED":
      return "cancelled";
    default:
      return "masuk";
  }
}

export const SERVICE_STATUS_LABELS: Record<ServiceUiStatus, string> = {
  masuk: "Masuk",
  diagnosa: "Diagnosa",
  menunggu_persetujuan: "Menunggu Persetujuan",
  perbaikan: "Perbaikan",
  qc: "QC",
  selesai: "Selesai",
  cancelled: "Dibatalkan",
};

export const STATUS_ORDER: ServiceUiStatus[] = [
  "masuk",
  "diagnosa",
  "menunggu_persetujuan",
  "perbaikan",
  "qc",
  "selesai",
];

export type DeviceIconKey =
  | "smartphone"
  | "tablet"
  | "laptop"
  | "desktop"
  | "watch"
  | "default";

export function getDeviceIconKey(
  deviceType?: string | null,
  deviceBrand?: string | null,
  deviceModel?: string | null,
): DeviceIconKey {
  const value = `${deviceType ?? ""} ${deviceBrand ?? ""} ${deviceModel ?? ""}`.toLowerCase();

  if (value.includes("phone") || value.includes("iphone") || value.includes("smartphone")) {
    return "smartphone";
  }

  if (value.includes("tablet") || value.includes("ipad")) {
    return "tablet";
  }

  if (value.includes("laptop") || value.includes("macbook")) {
    return "laptop";
  }

  if (value.includes("pc") || value.includes("desktop") || value.includes("monitor")) {
    return "desktop";
  }

  if (value.includes("watch")) {
    return "watch";
  }

  return "default";
}
