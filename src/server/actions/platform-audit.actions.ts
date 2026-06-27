"use server";

import { headers } from "next/headers";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { setImpersonationCookie, clearImpersonationCookie } from "@/lib/auth/impersonation";
import {
  getPlatformAuditLogs,
  logPlatformAction,
  PLATFORM_ACTION_TYPES,
  type PlatformAuditLogRow,
} from "@/server/repositories/platform.repository";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import { ROLES } from "@/lib/permissions/roles";
import { randomUUID } from "crypto";

export type { PlatformAuditLogRow };

export interface PlatformAuditFilter {
  startDate?: string;
  endDate?: string;
  actions?: string[] | null;
  searchQuery?: string | null;
  page?: number;
  pageSize?: number;
}

async function requirePlatformOwner(): Promise<{
  profileId: string;
  name: string;
  email: string;
}> {
  const authResult = await getCurrentUser();
  if (!authResult.user) {
    throw new Error("Unauthorized");
  }
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER
  );
  if (!isPlatformOwner) {
    throw new Error("Akses ditolak. Hanya Platform Owner yang dapat mengakses panel ini.");
  }
  return {
    profileId: authResult.user.profileId,
    name: authResult.user.name,
    email: authResult.user.email,
  };
}

async function getRequestMetadata() {
  try {
    const headersList = await headers();
    return {
      ipAddress: headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null,
      userAgent: headersList.get("user-agent") ?? null,
      requestId: randomUUID(),
    };
  } catch {
    return { ipAddress: null, userAgent: null, requestId: randomUUID() };
  }
}

export async function getPlatformAuditLogsAction(
  filters: PlatformAuditFilter,
): Promise<ActionResult<{ rows: PlatformAuditLogRow[]; total: number }>> {
  try {
    await requirePlatformOwner();

    const pageSize = filters.pageSize ?? 25;
    const page = filters.page ?? 1;
    const offset = (page - 1) * pageSize;

    const { rows, total } = await getPlatformAuditLogs({
      startDate: filters.startDate,
      endDate: filters.endDate,
      actions: filters.actions && filters.actions.length > 0 ? filters.actions : null,
      searchQuery: filters.searchQuery || null,
      limit: pageSize,
      offset,
    });

    return successResult({ rows, total });
  } catch (err: any) {
    console.error("[PlatformAudit] getPlatformAuditLogsAction:", err.message);
    return errorResult(err.message || "Gagal memuat audit log.");
  }
}

export async function getPlatformAuditActionTypesAction(): Promise<
  ActionResult<string[]>
> {
  try {
    await requirePlatformOwner();
    return successResult([...PLATFORM_ACTION_TYPES]);
  } catch (err: any) {
    console.error("[PlatformAudit] getPlatformAuditActionTypesAction:", err.message);
    return errorResult(err.message || "Gagal memuat tipe aksi.");
  }
}

export async function loginAsTenantAction(
  brandId: number,
): Promise<ActionResult<{ slug: string; name: string }>> {
  try {
    const owner = await requirePlatformOwner();
    const { ipAddress, userAgent, requestId } = await getRequestMetadata();

    const supabase = createServiceRoleSupabaseClient();

    const { data: brand } = await supabase
      .from("brands")
      .select("slug, name")
      .eq("id", brandId)
      .maybeSingle();

    if (!brand) {
      return errorResult("Brand tidak ditemukan.");
    }

    await logPlatformAction({
      brandId,
      actorId: owner.profileId,
      actorName: owner.name,
      actorRole: ROLES.PLATFORM_OWNER,
      action: "LOGIN_AS_TENANT",
      targetType: "BRAND",
      targetLabel: brand.name,
      description: `Platform Owner "${owner.name}" login sebagai tenant "${brand.name}".`,
      details: { brandId, brandSlug: brand.slug, userAgent },
      ipAddress,
      requestId,
    });

    await setImpersonationCookie(brand.slug);

    return successResult({ slug: brand.slug, name: brand.name });
  } catch (err: any) {
    console.error("[PlatformAudit] loginAsTenantAction:", err.message);
    return errorResult(err.message || "Gagal login sebagai tenant.");
  }
}

export async function exitImpersonationAction(): Promise<ActionResult<null>> {
  try {
    const owner = await requirePlatformOwner();
    const { ipAddress, userAgent, requestId } = await getRequestMetadata();

    await clearImpersonationCookie();

    await logPlatformAction({
      brandId: null,
      actorId: owner.profileId,
      actorName: owner.name,
      actorRole: ROLES.PLATFORM_OWNER,
      action: "LOGIN_AS_TENANT",
      targetType: "SESSION",
      targetLabel: "Impersonation",
      description: `Platform Owner "${owner.name}" keluar dari mode impersonasi.`,
      details: { userAgent },
      ipAddress,
      requestId,
    });

    return successResult(null);
  } catch (err: any) {
    console.error("[PlatformAudit] exitImpersonationAction:", err.message);
    return errorResult(err.message || "Gagal keluar dari mode impersonasi.");
  }
}

export async function exportAuditLogsAction(
  filters: PlatformAuditFilter,
  format: "csv" | "json",
): Promise<ActionResult<string>> {
  try {
    await requirePlatformOwner();

    const pageSize = 5000;
    const { rows } = await getPlatformAuditLogs({
      startDate: filters.startDate,
      endDate: filters.endDate,
      actions: filters.actions && filters.actions.length > 0 ? filters.actions : null,
      searchQuery: filters.searchQuery || null,
      limit: pageSize,
      offset: 0,
    });

    if (format === "json") {
      return successResult(JSON.stringify(rows, null, 2));
    }

    const escapeCSV = (val: unknown): string => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers_row = ["Timestamp", "Action", "Actor", "Actor Email", "Target", "Target Type", "Brand", "Description"];
    const csvRows = rows.map((r) =>
      [
        r.createdAt,
        r.action,
        r.actorName,
        r.actorEmail,
        r.targetLabel,
        r.targetType,
        r.brandName,
        r.description,
      ]
        .map(escapeCSV)
        .join(","),
    );

    return successResult([headers_row.join(","), ...csvRows].join("\n"));
  } catch (err: any) {
    console.error("[PlatformAudit] exportAuditLogsAction:", err.message);
    return errorResult(err.message || "Gagal mengekspor audit log.");
  }
}
