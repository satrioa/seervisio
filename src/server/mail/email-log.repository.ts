import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export type EmailLogStatus = "success" | "failed" | "retry";

export interface EmailLogEntry {
  recipient: string;
  subject: string;
  template: string;
  provider?: string;
  providerMessageId?: string;
  status: EmailLogStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function insertEmailLog(entry: EmailLogEntry): Promise<string | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("email_logs")
    .insert({
      recipient: entry.recipient,
      subject: entry.subject,
      template: entry.template,
      provider: entry.provider ?? "brevo",
      provider_message_id: entry.providerMessageId ?? null,
      status: entry.status,
      error_message: entry.errorMessage ?? null,
      metadata: entry.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[email-log] insert error:", error.message);
    return null;
  }
  return (data as any)?.id ?? null;
}

export async function updateEmailLogStatus(
  id: string,
  status: EmailLogStatus,
  errorMessage?: string,
  providerMessageId?: string,
): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const update: Record<string, unknown> = { status };
  if (errorMessage) update.error_message = errorMessage;
  if (providerMessageId) update.provider_message_id = providerMessageId;
  const { error } = await (supabase as any)
    .from("email_logs")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error("[email-log] update error:", error.message);
  }
}

export interface EmailLogFilter {
  recipient?: string;
  template?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function getEmailLogs(
  filter: EmailLogFilter = {},
): Promise<any[]> {
  const supabase = createServiceRoleSupabaseClient();
  let query = (supabase as any)
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 50);

  if (filter.recipient) {
    query = query.ilike("recipient", `%${filter.recipient}%`);
  }
  if (filter.template) {
    query = query.eq("template", filter.template);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.offset) {
    query = query.range(filter.offset, filter.offset + (filter.limit ?? 50) - 1);
  }

  const { data } = await query;
  return data ?? [];
}
