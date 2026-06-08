/**
 * Service status machine constants and helpers.
 * Mirrors backend validate_service_status_transition() from migration 005.
 */

export const SERVICE_STATUS = {
  INTAKE: "INTAKE",
  DIAGNOSIS: "DIAGNOSIS",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  REPAIRING: "REPAIRING",
  QC: "QC",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;

export type ServiceStatus = (typeof SERVICE_STATUS)[keyof typeof SERVICE_STATUS];

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  INTAKE: "Intake",
  DIAGNOSIS: "Diagnosis",
  WAITING_APPROVAL: "Menunggu Persetujuan",
  REPAIRING: "Perbaikan",
  QC: "Quality Control",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const SERVICE_STATUS_COLORS: Record<ServiceStatus, string> = {
  INTAKE: "bg-blue-100 text-blue-800",
  DIAGNOSIS: "bg-yellow-100 text-yellow-800",
  WAITING_APPROVAL: "bg-orange-100 text-orange-800",
  REPAIRING: "bg-purple-100 text-purple-800",
  QC: "bg-cyan-100 text-cyan-800",
  DONE: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

/**
 * Valid status transitions based on backend validate_service_status_transition().
 * Terminal states (DONE, CANCELLED) have no outgoing transitions.
 */
export const SERVICE_STATUS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  INTAKE: ["DIAGNOSIS", "CANCELLED"],
  DIAGNOSIS: ["WAITING_APPROVAL", "REPAIRING", "CANCELLED"],
  WAITING_APPROVAL: ["REPAIRING", "CANCELLED"],
  REPAIRING: ["QC", "CANCELLED"],
  QC: ["DONE", "REPAIRING", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

/**
 * Check if a status transition is valid.
 */
export function canTransitionServiceStatus(
  fromStatus: ServiceStatus,
  toStatus: ServiceStatus
): boolean {
  if (fromStatus === toStatus) return true;
  return SERVICE_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}
