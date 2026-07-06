"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, handleActionError, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  getBrandTarget,
  getBranchTargets,
  upsertBrandTarget,
} from "@/repositories/brand-target.repository";
import { getBranchesByBrandId } from "@/repositories/branch.repository";

export type BrandTargetResponse = {
  brandMonthly: number;
  brandYearly: number;
  branches: {
    branchId: string;
    name: string;
    monthly: number;
    yearly: number;
  }[];
};

export async function getBrandTargetAction(
  brandSlug: string,
): Promise<ActionResult<BrandTargetResponse>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();

    const brandTarget = await getBrandTarget(adminDb as any, session.brandId);
    const branchTargets = await getBranchTargets(adminDb as any, session.brandId);
    const allBranches = await getBranchesByBrandId(adminDb as any, session.brandId);

    const targetMap = new Map(branchTargets.map((bt) => [bt.branchId, bt]));
    const branches = allBranches.map((b) => {
      const target = targetMap.get(b.id);
      return {
        branchId: b.id,
        name: b.name,
        monthly: target?.monthlyAmount ?? 0,
        yearly: target?.yearlyAmount ?? 0,
      };
    });

    return successResult({
      brandMonthly: brandTarget?.monthlyAmount ?? 0,
      brandYearly: brandTarget?.yearlyAmount ?? 0,
      branches,
    });
  } catch (err: any) {
    console.error("[getBrandTargetAction]", err);
    return errorResult(err.message ?? "Gagal memuat target.");
  }
}

export type BrandTargetBranchInput = {
  branchId: string;
  monthly: number;
  yearly: number;
};

export async function saveBrandTargetAction(
  brandSlug: string,
  data: {
    brandMonthly: number;
    brandYearly: number;
    branches?: BrandTargetBranchInput[];
  },
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();

    if (data.brandMonthly < 0 || data.brandYearly < 0) {
      return errorResult("Target tidak boleh negatif.");
    }

    await upsertBrandTarget(adminDb as any, session.brandId, {
      targetType: "brand",
      monthlyAmount: data.brandMonthly,
      yearlyAmount: data.brandYearly,
    });

    if (data.branches) {
      for (const branch of data.branches) {
        if (branch.monthly >= 0 && branch.yearly >= 0) {
          await upsertBrandTarget(adminDb as any, session.brandId, {
            branchId: branch.branchId,
            targetType: "branch",
            monthlyAmount: branch.monthly,
            yearlyAmount: branch.yearly,
          });
        }
      }
    }

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "TARGET_GOAL_UPDATED",
      target_type: "BRAND_TARGET",
      target_label: "Target Revenue",
      description: "Target revenue brand diperbarui.",
      details: { section: "target_goal" },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[saveBrandTargetAction]", err);
    return handleActionError(err, "Gagal menyimpan target.");
  }
}
