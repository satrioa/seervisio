"use server";

/**
 * service-workflow.actions.ts
 * Server actions for service status transitions.
 *
 * All UI flows (Kanban, list view, detail modal, API) MUST call
 * these actions to update service status. No direct status mutations.
 *
 * Pattern: validate → authorize → execute → log → return Result
 */

import {
  validateServiceStatusTransition,
  validateCancelService,
  validateReopenService,
  toDbStatus,
  fromDbStatus,
  type ServiceWorkflowStatus,
  type ServiceWorkflowRole,
} from "@/domain/service/service-workflow";
import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/* ─── Types ─── */

export interface UpdateStatusInput {
  serviceId: string;
  nextStatus: ServiceWorkflowStatus;
  reason?: string;
}

export interface UpdateStatusResult {
  serviceId: string;
  previousStatus: ServiceWorkflowStatus;
  newStatus: ServiceWorkflowStatus;
  previousDbStatus: string;
  newDbStatus: string;
}

export interface CancelServiceInput {
  serviceId: string;
  reason: string;
  returnStock?: boolean;
}

export interface CancelServiceResult {
  serviceId: string;
  cancelledStatus: ServiceWorkflowStatus;
  sparepartsReturned: number;
  stockReturned: boolean;
}

export interface ReopenServiceInput {
  serviceId: string;
  reason: string;
}

export interface ReopenServiceResult {
  serviceId: string;
  restoredStatus: ServiceWorkflowStatus;
}

/* ─── Mock role resolver (will be replaced with real auth) ─── */

function getMockRole(): ServiceWorkflowRole {
  return "MASTER_ADMIN";
}

function getMockUserId(): string {
  return "mock-user-id";
}

function getMockUserName(): string {
  return "Master Admin";
}

/* ─── Stub DB functions (will be replaced with real queries) ─── */

async function fetchServiceFromDb(serviceId: string): Promise<{
  id: string;
  status: string;
  previousStatus?: string | null;
} | null> {
  // TODO: Replace with real Supabase query
  // For now, return null to indicate "not implemented" at DB level
  return null;
}

async function updateServiceStatusInDb(
  serviceId: string,
  newDbStatus: string,
  previousDbStatus: string
): Promise<boolean> {
  // TODO: Replace with real Supabase update
  return false;
}

async function insertTimelineEntry(params: {
  serviceId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  // TODO: Replace with real Supabase insert
  return false;
}

async function insertAuditLog(params: {
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  brandId?: number;
  targetId: string;
  targetType: string;
  targetLabel?: string;
  description?: string;
  details?: Record<string, unknown>;
}): Promise<boolean> {
  // TODO: Replace with real Supabase insert
  return false;
}

async function fetchUsedSpareparts(
  serviceId: string
): Promise<{ name: string; qty: number; price: number }[]> {
  // TODO: Replace with real Supabase query
  return [];
}

async function returnSparepartToInventory(params: {
  serviceId: string;
  sparepartName: string;
  qty: number;
  brandId: number;
  branchId: string;
  changedBy: string;
}): Promise<boolean> {
  // TODO: Replace with real Supabase insert inventory movement
  return false;
}

/* ══════════════════════════════════════════════
   UPDATE STATUS ACTION
   ══════════════════════════════════════════════ */

export async function updateServiceStatusAction(
  input: UpdateStatusInput
): Promise<Result<UpdateStatusResult>> {
  const { serviceId, nextStatus, reason } = input;

  // 1. Fetch current service from DB (never trust client status)
  const service = await fetchServiceFromDb(serviceId);
  if (!service) {
    return fail("Servis tidak ditemukan. Fitur ini membutuhkan koneksi database.");
  }

  const currentDbStatus = service.status;
  const currentStatus = fromDbStatus(currentDbStatus);

  // 2. Get current user role
  const role = getMockRole();

  // 3. Validate transition using centralized domain logic
  const validation = validateServiceStatusTransition({
    currentStatus,
    nextStatus,
    role,
    reason,
  });

  if (!validation.allowed) {
    return fail(validation.reason ?? "Transisi status tidak valid.");
  }

  // 4. Execute transition
  const newDbStatus = toDbStatus(nextStatus);
  const dbUpdated = await updateServiceStatusInDb(serviceId, newDbStatus, currentDbStatus);
  if (!dbUpdated) {
    return fail("Gagal memperbarui status servis. Database belum terhubung.");
  }

  // 5. Create service timeline entry
  await insertTimelineEntry({
    serviceId,
    fromStatus: currentDbStatus,
    toStatus: newDbStatus,
    changedBy: getMockUserId(),
    reason,
    metadata: { role, requiresReason: validation.requiresReason },
  });

  // 6. Create audit log entry
  await insertAuditLog({
    action: "service.status.transition",
    actorId: getMockUserId(),
    actorName: getMockUserName(),
    actorRole: role,
    targetId: serviceId,
    targetType: "service",
    targetLabel: `Status: ${currentDbStatus} → ${newDbStatus}`,
    description: `Status servis berubah dari ${currentDbStatus} ke ${newDbStatus}`,
    details: {
      previous_status: currentDbStatus,
      new_status: newDbStatus,
      reason,
      role,
    },
  });

  return ok({
    serviceId,
    previousStatus: currentStatus,
    newStatus: nextStatus,
    previousDbStatus: currentDbStatus,
    newDbStatus,
  });
}

/* ══════════════════════════════════════════════
   CANCEL SERVICE ACTION
   ══════════════════════════════════════════════ */

export async function cancelServiceAction(
  input: CancelServiceInput
): Promise<Result<CancelServiceResult>> {
  const { serviceId, reason, returnStock } = input;

  // 1. Fetch current service
  const service = await fetchServiceFromDb(serviceId);
  if (!service) {
    return fail("Servis tidak ditemukan. Fitur ini membutuhkan koneksi database.");
  }

  const currentDbStatus = service.status;
  const currentStatus = fromDbStatus(currentDbStatus);
  const role = getMockRole();

  // 2. Fetch used spareparts
  const usedSpareparts = await fetchUsedSpareparts(serviceId);
  const hasUsedSpareparts = usedSpareparts.length > 0;

  // 3. Validate cancel
  const validation = validateCancelService({
    currentStatus,
    role,
    reason,
    hasUsedSpareparts,
    returnStockConfirmed: returnStock,
  });

  if (!validation.allowed) {
    return fail(validation.reason ?? "Tidak dapat membatalkan servis.");
  }

  // 4. Update status to CANCELLED
  const cancelledDbStatus = toDbStatus("CANCELLED");
  const dbUpdated = await updateServiceStatusInDb(serviceId, cancelledDbStatus, currentDbStatus);
  if (!dbUpdated) {
    return fail("Gagal membatalkan servis. Database belum terhubung.");
  }

  // 5. Handle sparepart return
  let sparepartsReturned = 0;
  if (hasUsedSpareparts && returnStock) {
    for (const sp of usedSpareparts) {
      await returnSparepartToInventory({
        serviceId,
        sparepartName: sp.name,
        qty: sp.qty,
        brandId: 1, // TODO: resolve from context
        branchId: "", // TODO: resolve from context
        changedBy: getMockUserId(),
      });
      sparepartsReturned++;
    }
  }

  // 6. Create timeline entry
  await insertTimelineEntry({
    serviceId,
    fromStatus: currentDbStatus,
    toStatus: cancelledDbStatus,
    changedBy: getMockUserId(),
    reason,
    metadata: {
      action: "cancel",
      returnStock: returnStock ?? false,
      sparepartsReturned: hasUsedSpareparts ? usedSpareparts.length : 0,
    },
  });

  // 7. Create audit log entry
  await insertAuditLog({
    action: "service.cancel",
    actorId: getMockUserId(),
    actorName: getMockUserName(),
    actorRole: role,
    targetId: serviceId,
    targetType: "service",
    targetLabel: `Cancel: ${currentDbStatus} → ${cancelledDbStatus}`,
    description: `Servis dibatalkan. Alasan: ${reason}`,
    details: {
      previous_status: currentDbStatus,
      new_status: cancelledDbStatus,
      reason,
      returnStock: returnStock ?? false,
      used_spareparts: usedSpareparts.map((sp) => sp.name),
    },
  });

  return ok({
    serviceId,
    cancelledStatus: "CANCELLED",
    sparepartsReturned: hasUsedSpareparts ? usedSpareparts.length : 0,
    stockReturned: returnStock ?? false,
  });
}

/* ══════════════════════════════════════════════
   REOPEN SERVICE ACTION
   ══════════════════════════════════════════════ */

export async function reopenServiceAction(
  input: ReopenServiceInput
): Promise<Result<ReopenServiceResult>> {
  const { serviceId, reason } = input;

  // 1. Fetch current service
  const service = await fetchServiceFromDb(serviceId);
  if (!service) {
    return fail("Servis tidak ditemukan. Fitur ini membutuhkan koneksi database.");
  }

  const currentDbStatus = service.status;
  const currentStatus = fromDbStatus(currentDbStatus);
  const role = getMockRole();

  // 2. Validate reopen
  const validation = validateReopenService({
    currentStatus,
    role,
    reason,
  });

  if (!validation.allowed) {
    return fail(validation.reason ?? "Tidak dapat membuka ulang servis.");
  }

  // 3. Determine restore status
  // Use previous_status from DB if available, otherwise QC (penultimate status)
  const restoredStatus: ServiceWorkflowStatus = "QC";
  const restoredDbStatus = toDbStatus(restoredStatus);

  // 4. Update status
  const dbUpdated = await updateServiceStatusInDb(serviceId, restoredDbStatus, currentDbStatus);
  if (!dbUpdated) {
    return fail("Gagal membuka ulang servis. Database belum terhubung.");
  }

  // 5. Create timeline entry
  await insertTimelineEntry({
    serviceId,
    fromStatus: currentDbStatus,
    toStatus: restoredDbStatus,
    changedBy: getMockUserId(),
    reason,
    metadata: {
      action: "reopen",
      restoredFrom: currentDbStatus,
    },
  });

  // 6. Create audit log entry
  await insertAuditLog({
    action: "service.reopen",
    actorId: getMockUserId(),
    actorName: getMockUserName(),
    actorRole: role,
    targetId: serviceId,
    targetType: "service",
    targetLabel: `Reopen: ${currentDbStatus} → ${restoredDbStatus}`,
    description: `Servis dibuka ulang. Alasan: ${reason}`,
    details: {
      previous_status: currentDbStatus,
      new_status: restoredDbStatus,
      reason,
      role,
    },
  });

  return ok({
    serviceId,
    restoredStatus,
  });
}
