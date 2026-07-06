"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionData } from "@/server/actions/action-helper";

export async function validateBrandProfileExists(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("brands")
      .select("id, name, slug")
      .eq("id", session.brandId)
      .single();
    return { success: true, exists: !!(data?.name) };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateBranchesExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data, error } = await (supabase as any)
      .from("branches")
      .select("id")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateAccountsExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("user_brand_memberships")
      .select("id")
      .eq("brand_id", session.brandId)
      .eq("is_active", true)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validatePaymentAccountsExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("payment_accounts")
      .select("id")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validatePaymentMethodsExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("payment_methods")
      .select("id")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateTechniciansExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("user_brand_memberships")
      .select("id")
      .eq("brand_id", session.brandId)
      .eq("role", "TECHNICIAN")
      .eq("is_active", true)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateFrontlinersExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("user_brand_memberships")
      .select("id")
      .eq("brand_id", session.brandId)
      .eq("role", "FRONTLINER")
      .eq("is_active", true)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateSparepartsExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("inventory_items")
      .select("id")
      .eq("brand_id", session.brandId)
      .eq("service_usage_enabled", true)
      .eq("is_active", true)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateCustomersExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("customers")
      .select("id")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}

export async function validateServicesExist(brandSlug: string) {
  try {
    const supabase = await createServerSupabase();
    const session = await getSessionData(brandSlug);
    const { data } = await (supabase as any)
      .from("services")
      .select("id")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);
    return { success: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { success: false, exists: false };
  }
}
