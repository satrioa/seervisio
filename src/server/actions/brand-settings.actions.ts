"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, handleActionError, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getBrandSettings,
  upsertBrandSettings,
} from "@/repositories/brand-settings.repository";
import { sendTransactionalEmail } from "@/server/notifications/email-provider";

export type OperationalHoursInput = {
  timezone: string;
  branches: Record<string, Record<string, { isOpen: boolean; open?: string; close?: string; breakStart?: string; breakEnd?: string }>>;
  shiftTolerance: { openMinutes: number; closeMinutes: number };
  markOutsideAs: string;
};

export type NotificationEventConfig = {
  enabled: boolean;
  roles: string[];
  emails: string[];
  frequency: "realtime" | "daily_summary";
};

export type NotificationSettingsInput = {
  emailEnabled: boolean;
  events: Record<string, NotificationEventConfig>;
};

export type AutoCloseSettingsInput = {
  enabled: boolean;
  gracePeriodMinutes: number;
};

export type WorkflowRulesInput = {
  requireTechnicianBeforeDiagnosis: boolean;
  requirePaidBeforePickup: boolean;
  allowPartialPayment: boolean;
  allowReopenService: boolean;
  defaultWarrantyDays: number;
  defaultMdrMinTransaction: number;
  defaultLowStockThreshold: number;
};

export type BrandSettingsResponse = {
  businessHours: OperationalHoursInput | null;
  notificationSettings: NotificationSettingsInput | null;
  workflowRules: WorkflowRulesInput | null;
  autoCloseSettings: AutoCloseSettingsInput | null;
};

/* ── Helpers ── */

function getMetadataField(metadata: Record<string, any> | null | undefined, field: string, defaults: any): any {
  if (!metadata || !metadata[field]) return defaults;
  return metadata[field];
}

/* ── Load ── */

export async function getBrandSettingsAction(
  brandSlug: string,
): Promise<ActionResult<BrandSettingsResponse>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const settings = await getBrandSettings(adminDb as any, session.brandId);

    if (!settings) {
      return successResult({
        businessHours: null,
        notificationSettings: null,
        workflowRules: null,
        autoCloseSettings: null,
      });
    }

    const metadata = settings.metadata;

    return successResult({
      businessHours: (settings.businessHours ?? null) as OperationalHoursInput | null,
      notificationSettings: getMetadataField(metadata, "notification_settings", null) as NotificationSettingsInput | null,
      workflowRules: getMetadataField(metadata, "workflow_rules", null) as WorkflowRulesInput | null,
      autoCloseSettings: getMetadataField(metadata, "auto_close_settings", null) as AutoCloseSettingsInput | null,
    });
  } catch (err: any) {
    console.error("[getBrandSettingsAction]", err);
    return errorResult(err.message ?? "Gagal memuat pengaturan.");
  }
}

type SaveSection = "operational_hours" | "notification_settings" | "workflow_rules" | "auto_close_settings";

/* ── Save ── */

export async function saveBrandSettingsAction(
  brandSlug: string,
  section: SaveSection,
  data: any,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();

    const settings = await getBrandSettings(adminDb as any, session.brandId);
    const currentBusinessHours = settings?.businessHours ?? {};
    const currentMetadata = settings?.metadata ?? {};

    let updates: { business_hours?: Record<string, any>; metadata?: Record<string, any> } = {};
    let afterJson: Record<string, any> = {};

    if (section === "operational_hours") {
      updates.business_hours = data;
      afterJson = data;
    } else if (section === "notification_settings") {
      const newMetadata = { ...currentMetadata, notification_settings: data };
      updates.metadata = newMetadata;
      afterJson = data;
    } else if (section === "workflow_rules") {
      const newMetadata = { ...currentMetadata, workflow_rules: data };
      updates.metadata = newMetadata;
      afterJson = data;
    } else if (section === "auto_close_settings") {
      const newMetadata = { ...currentMetadata, auto_close_settings: data };
      updates.metadata = newMetadata;
      afterJson = data;
    }

    await upsertBrandSettings(adminDb as any, session.brandId, updates);

    /* Audit log */
    const sectionLabels: Record<string, string> = {
      operational_hours: "Jam Operasional",
      notification_settings: "Notifikasi",
      workflow_rules: "Aturan Workflow",
      auto_close_settings: "Penutupan Otomatis",
    };

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "SYSTEM_SETTINGS_UPDATED",
      target_type: "BRAND_SETTINGS",
      target_label: sectionLabels[section] ?? section,
      description: `Pengaturan ${sectionLabels[section] ?? section} diperbarui.`,
      details: { section, before: {}, after: afterJson },
    });

    console.log("[brand-settings/save]", {
      brandId: session.brandId,
      section,
      profileId: session.profileId,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[saveBrandSettingsAction]", err);
    return handleActionError(err, "Gagal menyimpan pengaturan.");
  }
}

/* ── Test Email ── */

export async function sendTestEmailAction(
  brandSlug: string,
  recipientEmail?: string,
): Promise<ActionResult<{ messageId: string | null }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const email = recipientEmail?.trim() || user?.email;

    if (!email) {
      return errorResult("No recipient email available. Provide an email address.");
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#16a34a;">Test Email — Seervis</h2>
        <p>Email notifikasi Seervis berhasil dikonfigurasi dan siap digunakan.</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:4px 8px;color:#666;">Brand</td><td style="padding:4px 8px;font-weight:600;">${session.brandName}</td></tr>
          <tr><td style="padding:4px 8px;color:#666;">Waktu</td><td style="padding:4px 8px;font-weight:600;">${new Date().toLocaleString("id-ID")}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;">Email ini dikirim atas permintaan pengaturan sistem.</p>
      </div>`;

    const result = await sendTransactionalEmail({
      to: [{ email }],
      subject: `[${session.brandName}] Test Notifikasi Email — Seervis`,
      htmlContent: html,
    });

    const adminDb = createServiceRoleSupabaseClient();
    await (adminDb as any).from("notification_logs").insert({
      brand_id: session.brandId,
      event_type: "TEST_EMAIL",
      recipient_email: email,
      subject: `[${session.brandName}] Test Notifikasi Email`,
      status: result.success ? "SENT" : "FAILED",
      error_message: result.error,
      metadata: { test_email: true, actor_profile_id: session.profileId },
    });

    if (!result.success) {
      return errorResult(result.error ?? "Gagal mengirim email test.");
    }

    return successResult({ messageId: result.messageId });
  } catch (err: any) {
    console.error("[sendTestEmailAction]", err);
    return handleActionError(err, "Gagal mengirim email test.");
  }
}
