import type { SupabaseClient } from "@supabase/supabase-js";

export interface BrandTargetData {
  id: string;
  brandId: number;
  branchId: string | null;
  targetType: string;
  period: string;
  monthlyAmount: number;
  yearlyAmount: number;
}

export interface BrandTargetInput {
  branchId?: string | null;
  targetType?: string;
  monthlyAmount: number;
  yearlyAmount: number;
}

function mapRow(row: any): BrandTargetData {
  return {
    id: row.id,
    brandId: row.brand_id,
    branchId: row.branch_id,
    targetType: row.target_type,
    period: row.period,
    monthlyAmount: row.monthly_amount ?? 0,
    yearlyAmount: row.yearly_amount ?? 0,
  };
}

export async function getBrandTarget(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<BrandTargetData | null> {
  const { data } = await supabase
    .from("brand_targets")
    .select("*")
    .eq("brand_id", brandId)
    .eq("target_type", "brand")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export async function getBranchTargets(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<BrandTargetData[]> {
  const { data } = await supabase
    .from("brand_targets")
    .select("*")
    .eq("brand_id", brandId)
    .eq("target_type", "branch")
    .not("branch_id", "is", null);

  return (data ?? []).map(mapRow);
}

export async function upsertBrandTarget(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
  input: BrandTargetInput,
): Promise<BrandTargetData> {
  const targetType = input.targetType ?? "brand";
  const query = supabase
    .from("brand_targets")
    .select("id")
    .eq("brand_id", brandId)
    .eq("target_type", targetType)
    .eq("period", "monthly");

  if (targetType === "branch" && input.branchId) {
    query.eq("branch_id", input.branchId);
  } else {
    query.is("branch_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  const payload: any = {
    brand_id: brandId,
    branch_id: targetType === "branch" ? (input.branchId ?? null) : null,
    target_type: targetType,
    monthly_amount: input.monthlyAmount,
    yearly_amount: input.yearlyAmount,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("brand_targets")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(`Gagal menyimpan target: ${error.message}`);
    return mapRow(data);
  } else {
    const { data, error } = await supabase
      .from("brand_targets")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Gagal membuat target: ${error.message}`);
    return mapRow(data);
  }
}

export async function deleteBranchTarget(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
  branchId: string,
): Promise<void> {
  const { error } = await supabase
    .from("brand_targets")
    .delete()
    .eq("brand_id", brandId)
    .eq("branch_id", branchId);

  if (error) throw new Error(`Gagal menghapus target cabang: ${error.message}`);
}
