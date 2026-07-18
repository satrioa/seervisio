import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { CouponRow } from "@/types/coupon";

function mapCoupon(row: any): CouponRow {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    currency: row.currency,
    maxUses: row.max_uses ?? null,
    usedCount: Number(row.used_count),
    maxUsesPerUser: row.max_uses_per_user ?? null,
    minOrderAmount: row.min_order_amount ?? null,
    isActive: row.is_active ?? false,
    startsAt: row.starts_at ?? null,
    expiresAt: row.expires_at ?? null,
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getActiveCouponByCode(code: string): Promise<CouponRow | null> {
  const supabase = createServiceRoleSupabaseClient() as any;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("is_active", true)
    .filter("code", "ilike", code.trim())
    .filter("starts_at", "lte", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCoupon(data) : null;
}

export async function incrementCouponUsage(code: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient() as any;
  await supabase.rpc("increment_coupon_usage", { p_code: code.toUpperCase() });
}
