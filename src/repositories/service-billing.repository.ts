import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { ServiceBillingItem, ServiceBillingData } from "@/server/domain/service-billing.types";

interface DbBillingRow {
  id: string;
  service_id: string;
  brand_id: number;
  type: "SERVICE_FEE" | "ADDITIONAL";
  description: string;
  amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapRowToItem(row: DbBillingRow): ServiceBillingItem {
  return {
    id: row.id,
    serviceId: row.service_id,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    sortOrder: row.sort_order,
  };
}

export async function getServiceBillingItems(
  serviceId: string,
): Promise<ServiceBillingData> {
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await (supabase as any)
    .from("service_billing_items")
    .select("*")
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const items: ServiceBillingItem[] = (data ?? []).map(mapRowToItem);
  const totalBill = items.reduce((sum: number, item: ServiceBillingItem) => sum + item.amount, 0);

  return { items, totalBill };
}

export async function saveServiceBillingItems(
  serviceId: string,
  brandId: number,
  items: Omit<ServiceBillingItem, "id" | "serviceId">[],
): Promise<ServiceBillingData> {
  const supabase = createServiceRoleSupabaseClient();

  // Validate minimum 1 item with amount > 0
  if (items.length === 0 || items.every((i) => i.amount <= 0)) {
    throw new Error("Minimal 1 item dengan nominal > 0 diperlukan.");
  }

  const totalBill = items.reduce((sum: number, item) => sum + item.amount, 0);

  // Transaction: delete old + insert new + update final_cost
  const { error: delError } = await (supabase as any)
    .from("service_billing_items")
    .delete()
    .eq("service_id", serviceId);

  if (delError) throw delError;

  if (items.length > 0) {
    const rows = items.map((item, idx) => ({
      service_id: serviceId,
      brand_id: brandId,
      type: item.type,
      description: item.description,
      amount: item.amount,
      sort_order: idx,
    }));

    const { error: insError } = await (supabase as any)
      .from("service_billing_items")
      .insert(rows);

    if (insError) throw insError;
  }

  // Update services.final_cost
  const { error: updError } = await (supabase as any)
    .from("services")
    .update({
      final_cost: totalBill,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  if (updError) throw updError;

  // Fetch back to get generated IDs
  return getServiceBillingItems(serviceId);
}
