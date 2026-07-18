import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

function adminDb() {
  return createServiceRoleSupabaseClient() as any;
}

export interface CustomerRow {
  id: string;
  brand_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  brand_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function searchCustomers(
  brandId: number,
  query: string
): Promise<CustomerRow[]> {
  const db = adminDb();
  const q = `%${query}%`;
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .or(`name.ilike.${q},phone.ilike.${q}`)
    .order("name", { ascending: true })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function findCustomerByPhone(
  brandId: number,
  phone: string
): Promise<CustomerRow | null> {
  const db = adminDb();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("brand_id", brandId)
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCustomerById(brandId: number, id: string): Promise<CustomerRow | null> {
  const db = adminDb();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("brand_id", brandId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<CustomerRow> {
  const db = adminDb();
  const { data, error } = await db
    .from("customers")
    .insert({
      brand_id: input.brand_id,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      metadata: {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function findOrCreateCustomer(
  input: CreateCustomerInput
): Promise<CustomerRow> {
  if (input.phone) {
    const existing = await findCustomerByPhone(input.brand_id, input.phone);
    if (existing) return existing;
  }
  return createCustomer(input);
}
