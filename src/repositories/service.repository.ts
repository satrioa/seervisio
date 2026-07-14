import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface ServiceRow {
  id: string;
  brand_id: number;
  branch_id: string;
  customer_id: string | null;
  service_number: string;
  device_type: string | null;
  device_brand: string | null;
  device_model: string | null;
  device_color: string | null;
  device_imei: string | null;
  device_serial_number: string | null;
  reported_issue: string;
  diagnosis_result: string | null;
  solution_notes: string | null;
  current_status: string;
  previous_status: string | null;
  assigned_technician_id: string | null;
  estimated_cost: number;
  final_cost: number;
  warranty_until: string | null;
  intake_at: string | null;
  diagnosis_at: string | null;
  waiting_approval_at: string | null;
  repairing_at: string | null;
  qc_at: string | null;
  done_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  picked_up_at: string | null;
  picked_up_by_profile_id: string | null;
  pickup_name: string | null;
  pickup_phone: string | null;
  pickup_relation: string | null;
  pickup_note: string | null;
}

export interface ServiceWithRelations extends ServiceRow {
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  technician?: {
    id: string;
    name?: string | null;
    full_name?: string | null;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
}

export async function getServicesByBranch(
  branchId: string
): Promise<ServiceWithRelations[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("services")
    .select(`
      *,
      customer:customers!services_customer_id_fkey(id, name, phone, email, address),
      technician:profiles!services_assigned_technician_id_fkey(id, name),
      branch:branches!services_branch_id_fkey(id, name)
    `)
    .eq("branch_id", branchId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getServiceById(
  id: string
): Promise<ServiceWithRelations | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("services")
    .select(`
      *,
      customer:customers!services_customer_id_fkey(id, name, phone, email, address),
      technician:profiles!services_assigned_technician_id_fkey(id, name),
      branch:branches!services_branch_id_fkey(id, name)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getServicesByBrand(
  brandId: number
): Promise<ServiceWithRelations[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("services")
    .select(`
      *,
      customer:customers!services_customer_id_fkey(id, name, phone, email, address),
      technician:profiles!services_assigned_technician_id_fkey(id, name),
      branch:branches!services_branch_id_fkey(id, name)
    `)
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface CreateServiceDBInput {
  brand_id: number;
  branch_id: string;
  customer_id: string;
  service_number: string;
  device_type?: string | null;
  device_brand?: string | null;
  device_model?: string | null;
  device_color?: string | null;
  device_imei?: string | null;
  device_serial_number?: string | null;
  reported_issue: string;
  diagnosis_result?: string | null;
  estimated_cost?: number;
  assigned_technician_id?: string | null;
  created_by: string;
}

export async function insertService(
  input: CreateServiceDBInput
): Promise<ServiceRow> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("services")
    .insert({
      brand_id: input.brand_id,
      branch_id: input.branch_id,
      customer_id: input.customer_id,
      service_number: input.service_number,
      device_type: input.device_type ?? null,
      device_brand: input.device_brand ?? null,
      device_model: input.device_model ?? null,
      device_color: input.device_color ?? null,
      device_imei: input.device_imei ?? null,
      device_serial_number: input.device_serial_number ?? null,
      reported_issue: input.reported_issue,
      diagnosis_result: input.diagnosis_result ?? null,
      estimated_cost: input.estimated_cost ?? 0,
      final_cost: input.estimated_cost ?? 0,
      assigned_technician_id: input.assigned_technician_id ?? null,
      current_status: "INTAKE",
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getServiceStatusSummary(
  brandId: number
): Promise<{ status: string; count: number }[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("services")
    .select("current_status")
    .eq("brand_id", brandId)
    .is("deleted_at", null);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.current_status] = (counts[row.current_status] ?? 0) + 1;
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export async function updateServiceTechnician(
  serviceId: string,
  technicianProfileId: string | null,
  updatedBy: string
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await (supabase as any)
    .from("services")
    .update({
      assigned_technician_id: technicianProfileId,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);
  if (error) throw error;
}

export async function updateServiceStatus(
  serviceId: string,
  newStatus: string,
  previousStatus: string,
  updatedBy: string,
  cancelReason?: string | null
): Promise<void> {
  const supabase = await createServerSupabase();
  const timestampColumns: Record<string, string> = {
    INTAKE: "intake_at",
    DIAGNOSIS: "diagnosis_at",
    WAITING_APPROVAL: "waiting_approval_at",
    REPAIRING: "repairing_at",
    QC: "qc_at",
    DONE: "done_at",
    CANCELLED: "cancelled_at",
  };

  const updateData: Record<string, unknown> = {
    current_status: newStatus,
    previous_status: previousStatus,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const tsCol = timestampColumns[newStatus];
  if (tsCol) {
    updateData[tsCol] = new Date().toISOString();
  }

  if (newStatus === "CANCELLED" && cancelReason) {
    updateData.cancel_reason = cancelReason;
  }

  const { error } = await (supabase as any)
    .from("services")
    .update(updateData)
    .eq("id", serviceId);
  if (error) throw error;
}

export async function updateServicePickupFields(
  serviceId: string,
  pickupName: string,
  pickupPhone: string | null,
  pickupRelation: string,
  pickupNote: string | null,
  pickedUpByProfileId: string
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await (supabase as any)
    .from("services")
    .update({
      picked_up_at: new Date().toISOString(),
      picked_up_by_profile_id: pickedUpByProfileId,
      pickup_name: pickupName,
      pickup_phone: pickupPhone,
      pickup_relation: pickupRelation,
      pickup_note: pickupNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);
  if (error) throw error;
}

export async function addServiceTimelineEntry(params: {
  brand_id: number;
  branch_id: string;
  service_id: string;
  from_status: string | null;
  to_status: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  changed_by: string;
}): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await (supabase as any)
    .from("service_status_history")
    .insert({
      brand_id: params.brand_id,
      branch_id: params.branch_id,
      service_id: params.service_id,
      from_status: params.from_status ?? null,
      to_status: params.to_status,
      reason: params.reason ?? null,
      metadata: params.metadata ?? {},
      changed_by: params.changed_by,
      changed_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function addAuditLog(params: {
  brand_id: number;
  branch_id?: string | null;
  action: string;
  target_type?: string;
  target_id?: string;
  target_label?: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  description?: string;
  details?: Record<string, unknown>;
  request_id?: string;
  ip_address?: string;
}): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await (supabase as any)
    .from("audit_logs")
    .insert({
      brand_id: params.brand_id,
      branch_id: params.branch_id ?? null,
      actor_id: params.actor_id ?? null,
      actor_name: params.actor_name ?? null,
      actor_role: params.actor_role ?? null,
      action: params.action,
      target_type: params.target_type ?? null,
      target_id: params.target_id ?? null,
      target_label: params.target_label ?? null,
      description: params.description ?? null,
      details: params.details ?? {},
      ip_address: params.ip_address ?? null,
      request_id: params.request_id ?? null,
      created_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function getServiceStatusHistory(
  serviceId: string
): Promise<any[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("service_status_history")
    .select(`
      *,
      changed_by_profile:profiles(id, full_name)
    `)
    .eq("service_id", serviceId)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ─── Service Billing Sync ─── */

export interface SyncBillingResult {
  previousFinalCost: number;
  newFinalCost: number;
  totalPaid: number;
  isPaymentSafe: boolean;
}

/**
 * Normalise services.final_cost based on estimated_cost and payment safety.
 *
 * Business rule: sparepart usage is stock tracking only and does NOT affect
 * service billing. final_cost is the customer-facing service charge.
 *
 *   newFinalCost = max(estimated_cost, totalPaid, 0)
 */
export async function syncServiceBillingFromEstimate(
  serviceId: string,
): Promise<SyncBillingResult> {
  const supabase = createServiceRoleSupabaseClient();

  const { data: service } = await (supabase as any)
    .from("services")
    .select("id, estimated_cost, final_cost")
    .eq("id", serviceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!service) throw new Error("Service not found");

  const estimatedCost = Number(service.estimated_cost ?? 0);
  const previousFinalCost = Number(service.final_cost ?? 0);

  const { data: payments } = await (supabase as any)
    .from("service_payments")
    .select("gross_amount, payment_status")
    .eq("service_id", serviceId)
    .eq("payment_status", "COMPLETED");

  const totalPaid = (payments ?? []).reduce(
    (sum: number, p: any) => sum + Number(p.gross_amount ?? 0),
    0,
  );

  let newFinalCost = Math.max(estimatedCost, totalPaid, 0);
  const isPaymentSafe = newFinalCost >= totalPaid;

  await (supabase as any)
    .from("services")
    .update({
      final_cost: newFinalCost,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  console.log("[syncServiceBillingFromEstimate]", {
    serviceId,
    estimatedCost,
    previousFinalCost,
    newFinalCost,
    totalPaid,
    isPaymentSafe,
  });

  return {
    previousFinalCost,
    newFinalCost,
    totalPaid,
    isPaymentSafe,
  };
}

export async function getServiceTotalPaid(
  serviceId: string,
): Promise<number> {
  const supabase = createServiceRoleSupabaseClient();
  const { data: payments } = await (supabase as any)
    .from("service_payments")
    .select("gross_amount")
    .eq("service_id", serviceId)
    .eq("payment_status", "COMPLETED");

  return (payments ?? []).reduce(
    (sum: number, p: any) => sum + Number(p.gross_amount ?? 0),
    0,
  );
}
