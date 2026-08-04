"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, requireBranchAccess, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export type PeriodFilter = "TODAY" | "7_DAYS" | "THIS_MONTH" | "CUSTOM";

export interface TechPerfFilters {
  period: PeriodFilter;
  branchId?: string | null;
  technicianProfileId?: string | null;
  customStart?: string | null;
  customEnd?: string | null;
}

export interface TrendDay {
  date: string;
  completed: number;
  revenue: number;
}

export interface PerformanceScoreData {
  score: number;
  previousScore: number | null;
  quality: number;
  sla: number;
  utilization: number;
}

export interface TeamCapacityData {
  activeService: number;
  busyTechnicians: number;
  availableTechnicians: number;
  capacityPercentage: number;
  maxCapacity: number;
}

export interface ServiceDistributionData {
  masuk: number;
  diagnosa: number;
  repair: number;
  qc: number;
  pickup: number;
  total: number;
}

export interface TechnicianStat {
  profileId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  branches: string[];
  revenue: number;
  completedCount: number;
  activeCount: number;
  totalAssigned: number;
  avgDurationHours: number | null;
  weeklyTrend: TrendDay[];
}

export interface TeamSummary {
  totalRevenue: number;
  totalCompleted: number;
  totalActive: number;
  totalUnassigned: number;
  avgDurationHours: number | null;
  completionRate: number;
  leaderboard: { profileId: string; name: string; completedCount: number; revenue: number }[];
}

export interface AlertItem {
  type: "unassigned" | "repairing_long" | "qc_long" | "active_long";
  count: number;
  label: string;
}

export interface TechPerfData {
  technicians: TechnicianStat[];
  teamSummary: TeamSummary;
  alerts: AlertItem[];
  trendOverall: TrendDay[];
  performanceScore: PerformanceScoreData;
  teamCapacity: TeamCapacityData;
  serviceDistribution: ServiceDistributionData;
  capacityPerTechnician: number; // configurable, default 5
}

function getPeriodDates(period: PeriodFilter, customStart?: string | null, customEnd?: string | null) {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
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
      const start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = customEnd ? new Date(customEnd + "T23:59:59.999Z") : endOfDay;
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }
}

export async function getTechnicianPerformanceAction(
  brandSlug: string,
  filters: TechPerfFilters,
): Promise<ActionResult<TechPerfData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.view");

    if (filters.branchId) {
      requireBranchAccess(session, filters.branchId, "getTechnicianPerformanceAction");
    }

    const adminDb = createServiceRoleSupabaseClient();

    const { start, end } = getPeriodDates(filters.period, filters.customStart, filters.customEnd);

    const now = new Date().toISOString();

    /* ── 1. Fetch active technicians ── */
    let techQuery = (adminDb as any)
      .from("user_brand_memberships")
      .select(`
        id,
        profile_id,
        profiles!inner(id, name, email, avatar_url),
        user_branch_access!left(
          branch_id,
          branches!left(name)
        )
      `)
      .eq("brand_id", session.brandId)
      .eq("role", "TECHNICIAN")
      .eq("is_active", true)
      .is("deleted_at", null);

    const { data: memberships, error: memErr } = await techQuery;
    if (memErr) throw memErr;

    const techProfileIds = (memberships ?? []).map((m: any) => m.profile_id);

    /* ── 2. Fetch services for these technicians in the period ── */
    let assignedServices: any[] = [];
    if (techProfileIds.length > 0) {
      const serviceQuery = (adminDb as any)
        .from("services")
        .select(`
          id,
          service_number,
          assigned_technician_id,
          current_status,
          final_cost,
          estimated_cost,
          intake_at,
          done_at,
          created_at,
          branch_id,
          customer_id
        `)
        .eq("brand_id", session.brandId)
        .in("assigned_technician_id", techProfileIds)
        .gte("intake_at", start)
        .lte("intake_at", end)
        .is("deleted_at", null);

      const { data: svcData, error: svcErr } = await serviceQuery;
      if (svcErr) throw svcErr;
      assignedServices = svcData ?? [];
    }

    /* ── 3. Fetch unassigned services ── */
    const unassignedQuery = (adminDb as any)
      .from("services")
      .select("id, current_status, intake_at")
      .eq("brand_id", session.brandId)
      .is("assigned_technician_id", null)
      .not("current_status", "in", '("DONE","CANCELLED")')
      .is("deleted_at", null);

    if (filters.branchId) {
      unassignedQuery.eq("branch_id", filters.branchId);
    }

    const { data: unassignedServices } = await unassignedQuery;

    /* ── 4. Build trend data (last 7 days) ── */
    const trendDays: TrendDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

      const dayCompleted = (assignedServices ?? []).filter(
        (s: any) =>
          s.current_status === "DONE" &&
          s.done_at &&
          s.done_at >= dayStart &&
          s.done_at <= dayEnd,
      );

      trendDays.push({
        date: dateKey,
        completed: dayCompleted.length,
        revenue: dayCompleted.reduce((sum: number, s: any) => sum + Number(s.final_cost ?? 0), 0),
      });
    }

    /* ── 5. Alerts ── */
    const repairingLongQuery = (adminDb as any)
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", session.brandId)
      .eq("current_status", "REPAIRING")
      .is("deleted_at", null)
      .lt("repairing_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

    if (filters.branchId) repairingLongQuery.eq("branch_id", filters.branchId);

    const { count: repairingLongCount } = await repairingLongQuery;

    const qcLongQuery = (adminDb as any)
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", session.brandId)
      .eq("current_status", "QC")
      .is("deleted_at", null)
      .lt("qc_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (filters.branchId) qcLongQuery.eq("branch_id", filters.branchId);

    const { count: qcLongCount } = await qcLongQuery;

    const alerts: AlertItem[] = [];
    if ((unassignedServices ?? []).length > 0) {
      alerts.push({ type: "unassigned", count: (unassignedServices ?? []).length, label: "Servis belum ditugaskan" });
    }
    if ((repairingLongCount ?? 0) > 0) {
      alerts.push({ type: "repairing_long", count: repairingLongCount ?? 0, label: "Perbaikan > 3 hari" });
    }
    if ((qcLongCount ?? 0) > 0) {
      alerts.push({ type: "qc_long", count: qcLongCount ?? 0, label: "QC > 1 hari" });
    }

    /* ── 6. Compute per-technician stats ── */
    const technicians: TechnicianStat[] = (memberships ?? []).map((m: any) => {
      const profile = m.profiles ?? {};
      const branchAccess: any[] = Array.isArray(m.user_branch_access) ? m.user_branch_access : [];
      const branches = branchAccess
        .map((ba: any) => ba.branches?.name)
        .filter(Boolean);

      const techServices = (assignedServices ?? []).filter(
        (s: any) => s.assigned_technician_id === m.profile_id,
      );

      const completed = techServices.filter((s: any) => s.current_status === "DONE");
      const active = techServices.filter(
        (s: any) => !["DONE", "CANCELLED"].includes(s.current_status),
      );

      const totalRevenue = completed.reduce(
        (sum: number, s: any) => sum + Number(s.final_cost ?? 0),
        0,
      );

      const durations = completed
        .map((s: any) => {
          if (!s.intake_at || !s.done_at) return null;
          const ms = new Date(s.done_at).getTime() - new Date(s.intake_at).getTime();
          return ms / (1000 * 60 * 60);
        })
        .filter((d: number | null): d is number => d !== null);

      const avgDuration =
        durations.length > 0
          ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
          : null;

      const weeklyTrend = trendDays.map((day) => {
        const dayCompleted = completed.filter((s: any) => {
          if (!s.done_at) return false;
          return s.done_at.slice(0, 10) === day.date;
        });
        return {
          date: day.date,
          completed: dayCompleted.length,
          revenue: dayCompleted.reduce((sum: number, s: any) => sum + Number(s.final_cost ?? 0), 0),
        };
      });

      return {
        profileId: m.profile_id,
        name: profile.name ?? "—",
        email: profile.email ?? "",
        avatarUrl: profile.avatar_url ?? null,
        branches,
        revenue: totalRevenue,
        completedCount: completed.length,
        activeCount: active.length,
        totalAssigned: techServices.length,
        avgDurationHours: avgDuration,
        weeklyTrend,
      };
    });

    /* ── 7. Team summary ── */
    const allCompleted = (assignedServices ?? []).filter((s: any) => s.current_status === "DONE");
    const allActive = (assignedServices ?? []).filter(
      (s: any) => !["DONE", "CANCELLED"].includes(s.current_status),
    );

    const allDurations = allCompleted
      .map((s: any) => {
        if (!s.intake_at || !s.done_at) return null;
        const ms = new Date(s.done_at).getTime() - new Date(s.intake_at).getTime();
        return ms / (1000 * 60 * 60);
      })
      .filter((d: number | null): d is number => d !== null);

    const teamAvgDuration =
      allDurations.length > 0
        ? allDurations.reduce((a: number, b: number) => a + b, 0) / allDurations.length
        : null;

    const totalAssigned = (assignedServices ?? []).length;
    const totalCompleted = allCompleted.length;

    const leaderboard = [...technicians]
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 4)
      .map((t) => ({
        profileId: t.profileId,
        name: t.name,
        completedCount: t.completedCount,
        revenue: t.revenue,
      }));

    /* ── 8. Service distribution (all active services in period) ── */
    let distributionQuery = (adminDb as any)
      .from("services")
      .select("current_status", { count: "exact", head: false })
      .eq("brand_id", session.brandId)
      .not("current_status", "in", '("DONE","CANCELLED")')
      .is("deleted_at", null);

    if (filters.branchId) {
      distributionQuery = distributionQuery.eq("branch_id", filters.branchId);
    }

    const { data: distributionRows } = await distributionQuery;

    const statusGroups: Record<string, number> = {};
    for (const row of (distributionRows ?? [])) {
      const status = (row as any).current_status ?? "UNKNOWN";
      statusGroups[status] = (statusGroups[status] ?? 0) + 1;
    }

    const serviceDistribution: ServiceDistributionData = {
      masuk: statusGroups["INTAKE"] ?? 0,
      diagnosa: (statusGroups["DIAGNOSING"] ?? 0) + (statusGroups["AWAITING_DIAGNOSIS"] ?? 0),
      repair: (statusGroups["REPAIRING"] ?? 0) + (statusGroups["AWAITING_SPAREPART"] ?? 0) + (statusGroups["AWAITING_CUSTOMER"] ?? 0),
      qc: statusGroups["QC"] ?? 0,
      pickup: statusGroups["READY_PICKUP"] ?? 0,
      total: (distributionRows ?? []).length,
    };

    /* ── 9. Team capacity ── */
    const CAPACITY_PER_TECHNICIAN = 5;
    const totalTechCount = (memberships ?? []).length;
    const maxCapacity = totalTechCount * CAPACITY_PER_TECHNICIAN;
    const activeService = allActive.length + (unassignedServices ?? []).length;
    const capacityPercentage = maxCapacity > 0 ? Math.round((activeService / maxCapacity) * 100) : 0;

    // Determine busy vs available technicians based on active assignments
    const busyTechIds = new Set<string>();
    for (const s of allActive) {
      if (s.assigned_technician_id) busyTechIds.add(s.assigned_technician_id);
    }
    const busyTechnicians = busyTechIds.size;
    const availableTechnicians = Math.max(0, totalTechCount - busyTechnicians);

    const teamCapacity: TeamCapacityData = {
      activeService,
      busyTechnicians,
      availableTechnicians,
      capacityPercentage,
      maxCapacity,
    };

    /* ── 10. Performance score (placeholder — single composite score from backend) ── */
    // TODO: calculate composite score from:
    //   - Service Completed
    //   - SLA Compliance
    //   - Quality Score
    //   - Customer Rating
    //   - Productivity
    //   - Utilization
    // For now, use a simple completion-based heuristic.
    const performanceScore: PerformanceScoreData = {
      score: totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      previousScore: null, // TODO: compare against previous period
      quality: totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      sla: totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      utilization: totalTechCount > 0 ? Math.round((busyTechnicians / totalTechCount) * 100) : 0,
    };

    const result: TechPerfData = {
      technicians,
      teamSummary: {
        totalRevenue: allCompleted.reduce((sum: number, s: any) => sum + Number(s.final_cost ?? 0), 0),
        totalCompleted: allCompleted.length,
        totalActive: allActive.length,
        totalUnassigned: (unassignedServices ?? []).length,
        avgDurationHours: teamAvgDuration,
        completionRate: totalAssigned > 0 ? totalCompleted / totalAssigned : 0,
        leaderboard,
      },
      alerts,
      trendOverall: trendDays,
      performanceScore,
      teamCapacity,
      serviceDistribution,
      capacityPerTechnician: CAPACITY_PER_TECHNICIAN,
    };

    console.log("[technician-performance]", {
      brandId: session.brandId,
      period: filters.period,
      techniciansCount: technicians.length,
      totalServices: (assignedServices ?? []).length,
      teamSummary: result.teamSummary,
    });

    return successResult(result);
  } catch (err: any) {
    console.error("[getTechnicianPerformanceAction]", err);
    return errorResult(err.message ?? "Gagal memuat data performa teknisi.");
  }
}
