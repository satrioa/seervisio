/**
 * service-workflow.ts
 * Centralized service workflow rules.
 *
 * Every service status change — Kanban drag/drop, list view, detail modal,
 * API, bulk action — MUST go through these validation functions.
 *
 * This layer is pure domain logic. No database access, no server imports.
 */

/* ─── Types ─── */

export type ServiceWorkflowStatus =
  | "MASUK"
  | "DIAGNOSA"
  | "PERBAIKAN"
  | "QC"
  | "SELESAI"
  | "CANCELLED";

export type ServiceWorkflowRole =
  | "MASTER_ADMIN"
  | "ADMIN"
  | "FRONTLINER"
  | "TECHNICIAN";

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  requiresReason?: boolean;
}

export interface ValidateTransitionInput {
  currentStatus: ServiceWorkflowStatus;
  nextStatus: ServiceWorkflowStatus;
  role: ServiceWorkflowRole;
  reason?: string;
}

export interface ValidateCancelInput {
  currentStatus: ServiceWorkflowStatus;
  role: ServiceWorkflowRole;
  reason?: string;
  hasUsedSpareparts?: boolean;
  returnStockConfirmed?: boolean;
}

export interface ValidateReopenInput {
  currentStatus: ServiceWorkflowStatus;
  role: ServiceWorkflowRole;
  reason?: string;
}

/* ─── Status Ordering ─── */

export const WORKFLOW_ORDER: Record<ServiceWorkflowStatus, number> = {
  MASUK: 1,
  DIAGNOSA: 2,
  PERBAIKAN: 3,
  QC: 4,
  SELESAI: 5,
  CANCELLED: -1,
};

export function getServiceStatusOrder(status: ServiceWorkflowStatus): number {
  return WORKFLOW_ORDER[status] ?? -1;
}

export function getNextServiceStatus(
  currentStatus: ServiceWorkflowStatus
): ServiceWorkflowStatus | null {
  const order = WORKFLOW_ORDER[currentStatus];
  if (order === undefined || order === -1) return null;
  // No special handling for DIAMBIL status as it has been removed
  const statuses: ServiceWorkflowStatus[] = [
    "MASUK", "DIAGNOSA", "PERBAIKAN", "QC", "SELESAI",
  ];
  const nextIndex = statuses.indexOf(currentStatus) + 1;
  return nextIndex < statuses.length ? statuses[nextIndex] : null;
}

export function isTerminalServiceStatus(
  status: ServiceWorkflowStatus
): boolean {
  return status === "CANCELLED";
}

export function isNormalForwardTransition(
  currentStatus: ServiceWorkflowStatus,
  nextStatus: ServiceWorkflowStatus
): boolean {
  if (nextStatus === "CANCELLED") return false;
  const currentOrder = WORKFLOW_ORDER[currentStatus];
  const nextOrder = WORKFLOW_ORDER[nextStatus];
  if (currentOrder === -1 || nextOrder === -1) return false;
  return nextOrder === currentOrder + 1;
}

/* ─── Labels ─── */

export const STATUS_LABELS: Record<ServiceWorkflowStatus, string> = {
  MASUK: "Masuk",
  DIAGNOSA: "Diagnosa",
  PERBAIKAN: "Perbaikan",
  QC: "QC",
  SELESAI: "Selesai",
  CANCELLED: "Dibatalkan",
};

export function getStatusLabel(status: ServiceWorkflowStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/* ─── Mapping to existing domain/db statuses ─── */

export const STATUS_MAP: Record<ServiceWorkflowStatus, string> = {
  MASUK: "INTAKE",
  DIAGNOSA: "DIAGNOSIS",
  PERBAIKAN: "REPAIRING",
  QC: "QC",
  SELESAI: "DONE",
  CANCELLED: "CANCELLED",
};

export function toDbStatus(status: ServiceWorkflowStatus): string {
  return STATUS_MAP[status] ?? status;
}

export function fromDbStatus(dbStatus: string): ServiceWorkflowStatus {
  const reverseMap: Record<string, ServiceWorkflowStatus> = {
    INTAKE: "MASUK",
    DIAGNOSIS: "DIAGNOSA",
    WAITING_APPROVAL: "DIAGNOSA",
    REPAIRING: "PERBAIKAN",
    QC: "QC",
    DONE: "SELESAI",
    CANCELLED: "CANCELLED",
  };
  return reverseMap[dbStatus] ?? "MASUK";
}

export function normalizeServiceStatus(
  input: string
): ServiceWorkflowStatus {
  const upper = input.toUpperCase().trim();

  // Direct DB status values
  if (upper === "INTAKE") return "MASUK";
  if (upper === "DIAGNOSIS") return "DIAGNOSA";
  if (upper === "WAITING_APPROVAL") return "DIAGNOSA";
  if (upper === "REPAIRING") return "PERBAIKAN";
  if (upper === "QC") return "QC";
  if (upper === "DONE") return "SELESAI";
  // PICKED_UP status removed; no mapping to DIAMBIL
  if (upper === "CANCELLED") return "CANCELLED";

  // Direct workflow status values
  if (upper === "MASUK") return "MASUK";
  if (upper === "DIAGNOSA") return "DIAGNOSA";
  if (upper === "PERBAIKAN") return "PERBAIKAN";
  if (upper === "SELESAI") return "SELESAI";
  // Direct workflow status DIAMBIL removed; no mapping

  // Partial/fuzzy matches
  if (upper.includes("MASUK") || upper === "INTAKE") return "MASUK";
  if (upper.includes("DIAGNOS") || upper === "DIAGNOSIS") return "DIAGNOSA";
  if (upper.includes("REPAIR") || upper.includes("PERBAIK")) return "PERBAIKAN";
  if (upper === "QC") return "QC";
  if (upper.includes("SELESAI") || upper === "DONE") return "SELESAI";
  // Ambil related terms no longer map to a status
  if (upper.includes("BATAL") || upper.includes("CANCEL")) return "CANCELLED";

  // Fallback
  return "MASUK";
}

/* ─── Role-Based Transition Rules ─── */

interface RoleTransitionEntry {
  allowedNext: ServiceWorkflowStatus[];
  canCancel: boolean;
  canReopen: boolean;
}

const ROLE_RULES: Record<ServiceWorkflowRole, Partial<Record<ServiceWorkflowStatus, RoleTransitionEntry>>> = {
  MASTER_ADMIN: {
    MASUK: { allowedNext: ["DIAGNOSA"], canCancel: true, canReopen: false },
    DIAGNOSA: { allowedNext: ["PERBAIKAN"], canCancel: true, canReopen: false },
    PERBAIKAN: { allowedNext: ["QC"], canCancel: true, canReopen: false },
    QC: { allowedNext: ["SELESAI"], canCancel: true, canReopen: false },
    SELESAI: { allowedNext: [], canCancel: false, canReopen: true },
    CANCELLED: { allowedNext: [], canCancel: false, canReopen: false },
  },
  ADMIN: {
    MASUK: { allowedNext: ["DIAGNOSA"], canCancel: true, canReopen: false },
    DIAGNOSA: { allowedNext: ["PERBAIKAN"], canCancel: true, canReopen: false },
    PERBAIKAN: { allowedNext: ["QC"], canCancel: true, canReopen: false },
    QC: { allowedNext: ["SELESAI"], canCancel: true, canReopen: false },
    SELESAI: { allowedNext: [], canCancel: false, canReopen: true },
    CANCELLED: { allowedNext: [], canCancel: false, canReopen: false },
  },
  FRONTLINER: {
    MASUK: { allowedNext: ["DIAGNOSA"], canCancel: true, canReopen: false },
    DIAGNOSA: { allowedNext: [], canCancel: true, canReopen: false },
    PERBAIKAN: { allowedNext: [], canCancel: false, canReopen: false },
    QC: { allowedNext: [], canCancel: false, canReopen: false },
    SELESAI: { allowedNext: [], canCancel: false, canReopen: false },
    CANCELLED: { allowedNext: [], canCancel: false, canReopen: false },
  },
  TECHNICIAN: {
    MASUK: { allowedNext: ["DIAGNOSA"], canCancel: false, canReopen: false },
    DIAGNOSA: { allowedNext: ["PERBAIKAN"], canCancel: false, canReopen: false },
    PERBAIKAN: { allowedNext: ["QC"], canCancel: false, canReopen: false },
    QC: { allowedNext: ["SELESAI"], canCancel: false, canReopen: false },
    SELESAI: { allowedNext: [], canCancel: false, canReopen: false },

    CANCELLED: { allowedNext: [], canCancel: false, canReopen: false },
  },
};

/* ─── Validation: Transition ─── */

export function canRoleTransitionServiceStatus(
  role: ServiceWorkflowRole,
  currentStatus: ServiceWorkflowStatus,
  nextStatus: ServiceWorkflowStatus
): boolean {
  const roleRules = ROLE_RULES[role];
  if (!roleRules) return false;
  const statusRules = roleRules[currentStatus];
  if (!statusRules) return false;
  return statusRules.allowedNext.includes(nextStatus);
}

export function validateServiceStatusTransition(
  input: ValidateTransitionInput
): TransitionValidationResult {
  const { currentStatus, nextStatus, role, reason } = input;

  if (currentStatus === nextStatus) {
    return { allowed: false, reason: "Status servis sudah sama." };
  }

  if (isTerminalServiceStatus(currentStatus)) {
return {
          allowed: false,
          reason:
            currentStatus === "CANCELLED"
              ? "Servis sudah dibatalkan. Tidak dapat mengubah status."
              : "Servis sudah selesai. Gunakan reopen flow untuk mengubah.",
        };

  }

  if (nextStatus === "CANCELLED") {
    return {
      allowed: false,
      reason: "Pembatalan servis harus menggunakan flow pembatalan. Gunakan cancel action.",
      requiresConfirmation: true,
    };
  }

  if (!isNormalForwardTransition(currentStatus, nextStatus)) {
    if (role === "MASTER_ADMIN" && reason && reason.trim().length > 0) {
      return {
        allowed: true,
        requiresReason: true,
        requiresConfirmation: true,
      };
    }
    const currentOrder = WORKFLOW_ORDER[currentStatus];
    const nextOrder = WORKFLOW_ORDER[nextStatus];
    if (nextOrder < currentOrder) {
      return {
        allowed: false,
        reason:
          "Perubahan status mundur membutuhkan alasan dan hanya dapat dilakukan oleh admin.",
      };
    }
    return {
      allowed: false,
      reason: "Status servis harus berpindah secara berurutan.",
    };
  }

  if (!canRoleTransitionServiceStatus(role, currentStatus, nextStatus)) {
    return {
      allowed: false,
      reason: "Role Anda tidak memiliki akses untuk mengubah status ini.",
    };
  }



  return { allowed: true };
}

/* ─── Validation: Cancel ─── */

const CANCELLABLE_STATUSES: ServiceWorkflowStatus[] = [
  "MASUK",
  "DIAGNOSA",
  "PERBAIKAN",
  "QC",
];

export function canCancelService(input: {
  currentStatus: ServiceWorkflowStatus;
  role: ServiceWorkflowRole;
}): boolean {
  const { currentStatus, role } = input;
  if (!CANCELLABLE_STATUSES.includes(currentStatus)) return false;
  const roleRules = ROLE_RULES[role];
  if (!roleRules) return false;
  const statusRules = roleRules[currentStatus];
  if (!statusRules) return false;
  return statusRules.canCancel;
}

export function validateCancelService(
  input: ValidateCancelInput
): TransitionValidationResult {
  const { currentStatus, role, reason, hasUsedSpareparts, returnStockConfirmed } = input;

  if (isTerminalServiceStatus(currentStatus)) {
    return {
      allowed: false,
      reason: "Servis sudah dalam status terminal. Tidak dapat membatalkan.",
    };
  }

  if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
    return {
      allowed: false,
      reason: "Servis selesai tidak bisa dibatalkan langsung. Buka ulang servis terlebih dahulu.",
    };
  }

  if (!canCancelService({ currentStatus, role })) {
    return {
      allowed: false,
      reason: "Role Anda tidak memiliki akses untuk membatalkan servis ini.",
    };
  }

  if (!reason || reason.trim().length === 0) {
    return {
      allowed: false,
      reason: "Pembatalan servis membutuhkan alasan.",
      requiresReason: true,
    };
  }

  if (hasUsedSpareparts && returnStockConfirmed === undefined) {
    return {
      allowed: false,
      reason: "Servis ini menggunakan sparepart. Pilih apakah stok akan dikembalikan.",
      requiresConfirmation: true,
    };
  }

  return { allowed: true };
}

/* ─── Validation: Reopen ─── */

export function canReopenService(input: {
  currentStatus: ServiceWorkflowStatus;
  role: ServiceWorkflowRole;
}): boolean {
  const { currentStatus, role } = input;
  if (currentStatus !== "SELESAI") return false;
  const roleRules = ROLE_RULES[role];
  if (!roleRules) return false;
  const statusRules = roleRules[currentStatus];
  if (!statusRules) return false;
  return statusRules.canReopen;
}

export function validateReopenService(
  input: ValidateReopenInput
): TransitionValidationResult {
  const { currentStatus, role, reason } = input;

if (currentStatus !== "SELESAI") {
      return {
        allowed: false,
        reason: "Hanya servis dengan status Selesai yang dapat dibuka ulang.",
      };
    }

  if (!canReopenService({ currentStatus, role })) {
    return {
      allowed: false,
      reason: "Role Anda tidak memiliki akses untuk membuka ulang servis ini.",
    };
  }

  if (!reason || reason.trim().length === 0) {
    return {
      allowed: false,
      reason: "Membuka ulang servis membutuhkan alasan.",
      requiresReason: true,
    };
  }



  return { allowed: true };
}

/* ─── Utility: Get allowed next statuses ─── */

export function getAllowedNextStatuses(
  role: ServiceWorkflowRole,
  currentStatus: ServiceWorkflowStatus
): ServiceWorkflowStatus[] {
  const roleRules = ROLE_RULES[role];
  if (!roleRules) return [];
  const statusRules = roleRules[currentStatus];
  if (!statusRules) return [];
  return statusRules.allowedNext.filter((next) => {
    const currentOrder = WORKFLOW_ORDER[currentStatus];
    const nextOrder = WORKFLOW_ORDER[next];
    return nextOrder > currentOrder;
  });
}

/* ─── Error Messages ─── */

export const WORKFLOW_ERROR_MESSAGES = {
  NOT_LINEAR: "Status servis harus berpindah secara berurutan.",
  NO_ROLE: "Role Anda tidak memiliki akses untuk mengubah status ini.",
  CANCEL_REQUIRES_REASON: "Pembatalan servis membutuhkan alasan.",
  CANCEL_DONE_FIRST: "Servis selesai tidak bisa dibatalkan langsung. Buka ulang servis terlebih dahulu.",
  BACKWARD_REQUIRES_REASON: "Perubahan status mundur membutuhkan alasan dan hanya dapat dilakukan oleh admin.",
  ALREADY_CANCELLED: "Servis sudah dibatalkan. Tidak dapat mengubah status.",
  ALREADY_CLOSED: "Servis sudah selesai dan diambil. Gunakan reopen flow untuk mengubah.",
  SAME_STATUS: "Status servis sudah sama.",
  MUST_USE_CANCEL: "Pembatalan servis harus menggunakan flow pembatalan. Gunakan cancel action.",
  REOPEN_WRONG_STATUS: "Hanya servis dengan status Selesai atau Diambil yang dapat dibuka ulang.",
  REOPEN_NO_ROLE: "Role Anda tidak memiliki akses untuk membuka ulang servis ini.",
  REOPEN_REQUIRES_REASON: "Membuka ulang servis membutuhkan alasan.",

} as const;

export function getServicePickupStatus(service: {
  current_status: string;
  picked_up_at: string | null;
}): "NOT_READY" | "READY" | "PICKED_UP" {
  if (service.current_status !== "SELESAI") return "NOT_READY";
  if (service.picked_up_at) return "PICKED_UP";
  return "READY";
}

