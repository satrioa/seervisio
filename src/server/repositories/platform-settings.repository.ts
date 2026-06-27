import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface PlatformSettings {
  id: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultMaxBranches: number;
  defaultMaxUsers: number;
  defaultTrialDays: number;
  systemName: string;
  systemEmail: string | null;
  supportEmail: string | null;
  invoicePrefix: string;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

function mapSettings(row: any): PlatformSettings {
  return {
    id: row.id,
    maintenanceMode: row.maintenance_mode ?? false,
    allowNewRegistrations: row.allow_new_registrations ?? true,
    defaultMaxBranches: row.default_max_branches ?? 3,
    defaultMaxUsers: row.default_max_users ?? 10,
    defaultTrialDays: row.default_trial_days ?? 14,
    systemName: row.system_name ?? "Seervisio",
    systemEmail: row.system_email ?? null,
    supportEmail: row.support_email ?? null,
    invoicePrefix: row.invoice_prefix ?? "INV",
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await (supabase as any)
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("getPlatformSettings error:", error);
    return null;
  }

  return mapSettings(data);
}

export async function updatePlatformSettings(
  settings: Partial<Omit<PlatformSettings, "id" | "updatedAt">>,
): Promise<PlatformSettings | null> {
  const supabase = createServiceRoleSupabaseClient();

  const dbRow: Record<string, unknown> = {};
  if (settings.maintenanceMode !== undefined) dbRow.maintenance_mode = settings.maintenanceMode;
  if (settings.allowNewRegistrations !== undefined) dbRow.allow_new_registrations = settings.allowNewRegistrations;
  if (settings.defaultMaxBranches !== undefined) dbRow.default_max_branches = settings.defaultMaxBranches;
  if (settings.defaultMaxUsers !== undefined) dbRow.default_max_users = settings.defaultMaxUsers;
  if (settings.defaultTrialDays !== undefined) dbRow.default_trial_days = settings.defaultTrialDays;
  if (settings.systemName !== undefined) dbRow.system_name = settings.systemName;
  if (settings.systemEmail !== undefined) dbRow.system_email = settings.systemEmail;
  if (settings.supportEmail !== undefined) dbRow.support_email = settings.supportEmail;
  if (settings.invoicePrefix !== undefined) dbRow.invoice_prefix = settings.invoicePrefix;
  if (settings.metadata !== undefined) dbRow.metadata = settings.metadata;

  dbRow.updated_at = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from("platform_settings")
    .update(dbRow)
    .eq("id", 1)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("updatePlatformSettings error:", error);
    return null;
  }

  return mapSettings(data);
}
