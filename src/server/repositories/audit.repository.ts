// src/server/repositories/audit.repository.ts

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface AuditLogRow {
  id: string;
  brandId: number;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorAvatarUrl: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  description: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

export interface AuditLogQueryParams {
  brandId: number;
  startDate: string;
  endDate: string;
  actorId?: string | null;
  actions?: string[] | null;
  searchQuery?: string | null;
  limit?: number;
  offset?: number;
}

export interface AuditLogCounts {
  total: number;
  today: number;
  sensitive: number;
  activeUsers: number;
}

function adminDb() {
  return createServiceRoleSupabaseClient() as any;
}

export async function queryAuditLogs(
  params: AuditLogQueryParams,
): Promise<{ rows: AuditLogRow[]; total: number }> {
  const db = adminDb();
  const limit = params.limit ?? 25;
  const offset = params.offset ?? 0;

  let query = db
    .from("audit_logs")
    .select(`
      id,
      brand_id,
      actor_id,
      action,
      target_type,
      target_id,
      target_label,
      description,
      details,
      created_at,
      profiles!audit_logs_actor_id_fkey(name, email, avatar_url)
    `, { count: "exact" })
    .eq("brand_id", params.brandId)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.actorId) {
    query = query.eq("actor_id", params.actorId);
  }

  if (params.actions && params.actions.length > 0) {
    query = query.in("action", params.actions);
  }

  if (params.searchQuery) {
    const q = `%${params.searchQuery}%`;
    query = query.or(
      `profiles.name.ilike.${q},profiles.email.ilike.${q},description.ilike.${q},action.ilike.${q},target_label.ilike.${q},target_type.ilike.${q}`,
    );
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const rows: AuditLogRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    brandId: r.brand_id,
    actorId: r.actor_id,
    actorName: r.profiles?.name ?? null,
    actorEmail: r.profiles?.email ?? null,
    actorAvatarUrl: r.profiles?.avatar_url ?? null,
    actorRole: null,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    targetLabel: r.target_label,
    description: r.description,
    details: r.details as Record<string, any> | null,
    createdAt: r.created_at,
  }));

  return { rows, total: count ?? rows.length };
}

export async function getAuditCounts(
  params: AuditLogQueryParams,
): Promise<AuditLogCounts> {
  const db = adminDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sensitiveActions = [
    "DELETE", "REMOVE", "VOID", "ROLLBACK", "ACCOUNT_REMOVED",
    "PAYMENT_ACCOUNT_DELETED", "IMPORT_ROLLBACK", "CANCEL_SERVICE",
    "BALANCE_ADJUSTMENT", "REFUND", "PASSWORD_RESET",
    "PAYMENT_METHOD_CHANGED",
  ];

  let baseQuery = db
    .from("audit_logs")
    .select("id, action, actor_id, created_at", { count: "exact", head: true })
    .eq("brand_id", params.brandId)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate);

  if (params.actorId) {
    baseQuery = baseQuery.eq("actor_id", params.actorId);
  }

  if (params.searchQuery) {
    const q = `%${params.searchQuery}%`;
    baseQuery = baseQuery.or(
      `description.ilike.${q},action.ilike.${q},target_label.ilike.${q}`,
    );
  }

  const { count: total } = await baseQuery;

  const todayQuery = db
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", params.brandId)
    .gte("created_at", todayStart.toISOString());

  const { count: today } = await todayQuery;

  const sensitiveQuery = db
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", params.brandId)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate)
    .in("action", sensitiveActions);

  const { count: sensitive } = await sensitiveQuery;

  const usersQuery = db
    .from("audit_logs")
    .select("actor_id", { count: "exact", head: true })
    .eq("brand_id", params.brandId)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate)
    .not("actor_id", "is", null);

  if (params.searchQuery) {
    const q = `%${params.searchQuery}%`;
    usersQuery.or(`description.ilike.${q},action.ilike.${q}`);
  }

  const { count: activeUsers } = await usersQuery;

  return {
    total: total ?? 0,
    today: today ?? 0,
    sensitive: sensitive ?? 0,
    activeUsers: activeUsers ?? 0,
  };
}

export async function getDistinctActors(
  brandId: number,
  startDate: string,
  endDate: string,
): Promise<{ actorId: string; name: string | null; email: string | null }[]> {
  const db = adminDb();

  const { data } = await db
    .from("audit_logs")
    .select(`
      actor_id,
      profiles!audit_logs_actor_id_fkey(name, email)
    `)
    .eq("brand_id", brandId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .not("actor_id", "is", null)
    .order("actor_id");

  const seen = new Set<string>();
  const result: { actorId: string; name: string | null; email: string | null }[] = [];

  for (const r of data ?? []) {
    if (!r.actor_id || seen.has(r.actor_id)) continue;
    seen.add(r.actor_id);
    result.push({
      actorId: r.actor_id,
      name: r.profiles?.name ?? null,
      email: r.profiles?.email ?? null,
    });
  }

  return result;
}
