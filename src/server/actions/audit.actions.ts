"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, type ActionResult } from "./action-helper";
import {
  queryAuditLogs,
  getAuditCounts,
  getDistinctActors,
  type AuditLogRow,
  type AuditLogCounts,
} from "@/server/repositories/audit.repository";

export type { AuditLogRow, AuditLogCounts };

export interface AuditFilterParams {
  period: "TODAY" | "7_DAYS" | "THIS_MONTH" | "CUSTOM";
  customStart?: string | null;
  customEnd?: string | null;
  actorId?: string | null;
  searchQuery?: string | null;
  moduleFilter?: string | null;
  severityFilter?: string | null;
  page?: number;
  pageSize?: number;
}

function getDateRange(params: AuditFilterParams) {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (params.period) {
    case "TODAY": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: endOfDay.toISOString() };
    }
    case "7_DAYS": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: endOfDay.toISOString() };
    }
    case "THIS_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end: endOfDay.toISOString() };
    }
    case "CUSTOM": {
      const start = params.customStart
        ? new Date(params.customStart).toISOString()
        : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = params.customEnd
        ? new Date(params.customEnd + "T23:59:59.999Z").toISOString()
        : endOfDay.toISOString();
      return { start, end };
    }
  }
}

/* ── Module / severity mapping helpers ── */

const MODULE_ACTION_MAP: Record<string, string[]> = {
  SERVICE: ["SERVICE_CREATED", "SERVICE_STATUS_UPDATED", "SERVICE_UPDATED", "CANCEL_SERVICE", "SERVICE_COMPLETED", "TECHNICIAN_ASSIGNED"],
  POS: ["POS_TRANSACTION_CREATED", "POS_TRANSACTION_VOID"],
  FINANCE: ["CREATE", "VOID"],
  INVENTORY: ["STOCK_ADJUSTMENT_IN", "STOCK_ADJUSTMENT_OUT", "STOCK_OPNAME_ADJUSTMENT"],
  ACCOUNT: ["ACCOUNT_CREATED", "ACCOUNT_REMOVED", "PASSWORD_RESET"],
  PAYMENT_METHOD: ["PAYMENT_METHOD_LINKED", "PAYMENT_METHOD_CHANGED", "PAYMENT_ACCOUNT_CREATED", "PAYMENT_ACCOUNT_UPDATED", "PAYMENT_ACCOUNT_DELETED", "PAYMENT_ACCOUNT_ARCHIVED", "PAYMENT_ACCOUNT_BALANCE_ADJUSTED", "CASH_ACCOUNT_CREATED", "PAYMENT_ACCOUNT_GLOBAL_CREATED", "PAYMENT_ACCOUNT_BRANCH_CREATED"],
  SHIFT: ["STORE_SHIFT_OPENED", "STORE_SHIFT_CLOSED"],
  SYSTEM: ["SYSTEM_SETTINGS_UPDATED"],
};

const SEVERITY_CRITICAL = [
  "DELETE", "REMOVE", "VOID", "ROLLBACK", "ACCOUNT_REMOVED",
  "PAYMENT_ACCOUNT_DELETED", "IMPORT_ROLLBACK", "POS_TRANSACTION_VOID",
];

const SEVERITY_WARNING = [
  "CANCEL_SERVICE", "BALANCE_ADJUSTMENT", "REFUND",
  "STOCK_ADJUSTMENT_IN", "STOCK_ADJUSTMENT_OUT", "PASSWORD_RESET",
  "PAYMENT_METHOD_CHANGED", "PAYMENT_ACCOUNT_BALANCE_ADJUSTED",
];

const SEVERITY_IMPORTANT = [
  "SERVICE_CREATED", "SERVICE_STATUS_UPDATED", "SERVICE_COMPLETED",
  "PAYMENT_ACCOUNT_CREATED", "PAYMENT_ACCOUNT_UPDATED",
  "PAYMENT_ACCOUNT_GLOBAL_CREATED", "PAYMENT_ACCOUNT_BRANCH_CREATED",
  "CASH_ACCOUNT_CREATED", "STOCK_OPNAME_ADJUSTMENT", "ACCOUNT_CREATED",
  "STORE_SHIFT_OPENED", "STORE_SHIFT_CLOSED", "SYSTEM_SETTINGS_UPDATED",
  "PAYMENT_METHOD_LINKED", "TECHNICIAN_ASSIGNED",
];

function mapSeverity(action: string): "critical" | "warning" | "important" | "info" {
  if (SEVERITY_CRITICAL.includes(action)) return "critical";
  if (SEVERITY_WARNING.includes(action)) return "warning";
  if (SEVERITY_IMPORTANT.includes(action)) return "important";
  return "info";
}

function mapModule(action: string): string {
  for (const [mod, actions] of Object.entries(MODULE_ACTION_MAP)) {
    if (actions.includes(action)) return mod;
  }
  return "OTHER";
}

/* ── Actions ── */

export async function getAuditLogsAction(
  brandSlug: string,
  filters: AuditFilterParams,
): Promise<ActionResult<{ rows: AuditLogRow[]; total: number; counts: AuditLogCounts; actors: { actorId: string; name: string | null; email: string | null }[] }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "audit_log.view");

    const { start, end } = getDateRange(filters);
    const pageSize = filters.pageSize ?? 25;
    const page = filters.page ?? 1;
    const offset = (page - 1) * pageSize;

    let actions: string[] | null = null;
    if (filters.moduleFilter && filters.moduleFilter !== "**ALL_MODULES**") {
      actions = MODULE_ACTION_MAP[filters.moduleFilter] ?? null;
    }

    const { rows, total } = await queryAuditLogs({
      brandId: session.brandId,
      startDate: start,
      endDate: end,
      actorId: filters.actorId && filters.actorId !== "**ALL_USERS**" ? filters.actorId : null,
      actions,
      searchQuery: filters.searchQuery || null,
      limit: pageSize,
      offset,
    });

    const counts = await getAuditCounts({
      brandId: session.brandId,
      startDate: start,
      endDate: end,
      actorId: filters.actorId && filters.actorId !== "**ALL_USERS**" ? filters.actorId : null,
      searchQuery: filters.searchQuery || null,
    });

    const actors = await getDistinctActors(session.brandId, start, end);

    return successResult({ rows, total, counts, actors });
  } catch (err: any) {
    console.error("[getAuditLogsAction]", err);
    return errorResult(err.message ?? "Gagal memuat log aktivitas.");
  }
}
