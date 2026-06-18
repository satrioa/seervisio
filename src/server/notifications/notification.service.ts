// src/server/notifications/notification.service.ts

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getBrandSettings } from "@/repositories/brand-settings.repository";
import { sendTransactionalEmail } from "./email-provider";

export interface OperationalNotificationInput {
  brandId: number;
  branchId?: string | null;
  eventType: string;
  actorProfileId?: string | null;
  payload: Record<string, any>;
}

interface NotificationEventConfig {
  enabled: boolean;
  roles: string[];
  emails: string[];
  frequency: "realtime" | "daily_summary";
}

interface NotificationSettings {
  emailEnabled: boolean;
  events: Record<string, NotificationEventConfig>;
}

/* ── Email builders ── */

function buildEmail(eventType: string, brandName: string, payload: Record<string, any>): { subject: string; html: string } | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.seervisio.com";

  switch (eventType) {
    case "CLOSE_SHIFT": {
      const branch = payload.branchName ?? "";
      const shiftNumber = payload.shiftNumber ?? "";
      const expectedCash = formatRp(payload.expectedCash ?? 0);
      const countedCash = formatRp(payload.countedCash ?? 0);
      const diff = (payload.cashDifference ?? 0);
      const diffSign = diff >= 0 ? "+" : "";
      return {
        subject: `[${brandName}] Shift ${shiftNumber} ditutup — ${branch}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#f59e0b;">Shift Ditutup</h2>
            <p>Shift <strong>${shiftNumber}</strong> di <strong>${branch}</strong> telah ditutup.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Kas awal</td><td style="padding:4px 8px;font-weight:600;">${expectedCash}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Kas akhir</td><td style="padding:4px 8px;font-weight:600;">${countedCash}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Selisih</td><td style="padding:4px 8px;font-weight:600;color:${diff < 0 ? "#dc2626" : "#16a34a"};">${diffSign}${formatRp(Math.abs(diff))}</td></tr>
            </table>
            <p style="color:#888;font-size:12px;">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>`,
      };
    }

    case "CASH_DIFFERENCE_DETECTED": {
      const branch = payload.branchName ?? "";
      const diff = (payload.cashDifference ?? 0);
      const diffSign = diff >= 0 ? "+" : "";
      return {
        subject: `[${brandName}] Selisih kas terdeteksi — ${branch}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#dc2626;">Selisih Kas</h2>
            <p>Terdeteksi selisih kas di <strong>${branch}</strong>.</p>
            <p style="font-size:24px;font-weight:700;color:${diff < 0 ? "#dc2626" : "#16a34a"};margin:16px 0;">${diffSign}${formatRp(Math.abs(diff))}</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Kas diharapkan</td><td style="padding:4px 8px;font-weight:600;">${formatRp(payload.expectedCash ?? 0)}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Kas dihitung</td><td style="padding:4px 8px;font-weight:600;">${formatRp(payload.countedCash ?? 0)}</td></tr>
            </table>
            <p style="color:#888;font-size:12px;">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>`,
      };
    }

    case "PAYMENT_RECEIVED": {
      const serviceNumber = payload.serviceNumber ?? "";
      const amount = formatRp(payload.amount ?? 0);
      const paymentType = payload.paymentType ?? "FINAL";
      const typeLabels: Record<string, string> = { DOWN_PAYMENT: "DP", PARTIAL_PAYMENT: "Cicilan", FINAL_PAYMENT: "Pelunasan" };
      return {
        subject: `[${brandName}] Pembayaran diterima — ${serviceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#16a34a;">Pembayaran Diterima</h2>
            <p>Pembayaran servis <strong>${serviceNumber}</strong> telah diterima.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Jumlah</td><td style="padding:4px 8px;font-weight:600;font-size:18px;">${amount}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Tipe</td><td style="padding:4px 8px;font-weight:600;">${typeLabels[paymentType] ?? paymentType}</td></tr>
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#f59e0b;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Servis</a>
          </div>`,
      };
    }

    case "SERVICE_COMPLETED": {
      const serviceNumber = payload.serviceNumber ?? "";
      const customerName = payload.customerName ?? "";
      const deviceInfo = [payload.deviceType, payload.deviceBrand, payload.deviceModel].filter(Boolean).join(" ");
      return {
        subject: `[${brandName}] Servis selesai — ${serviceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#16a34a;">Servis Selesai</h2>
            <p>Servis <strong>${serviceNumber}</strong> telah selesai dikerjakan.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              ${customerName ? `<tr><td style="padding:4px 8px;color:#666;">Pelanggan</td><td style="padding:4px 8px;font-weight:600;">${customerName}</td></tr>` : ""}
              ${deviceInfo ? `<tr><td style="padding:4px 8px;color:#666;">Perangkat</td><td style="padding:4px 8px;font-weight:600;">${deviceInfo}</td></tr>` : ""}
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#f59e0b;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Servis</a>
          </div>`,
      };
    }

    case "SERVICE_CREATED": {
      const serviceNumber = payload.serviceNumber ?? "";
      const customerName = payload.customerName ?? "";
      const deviceInfo = [payload.deviceType, payload.deviceBrand, payload.deviceModel].filter(Boolean).join(" ");
      return {
        subject: `[${brandName}] Servis baru — ${serviceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#f59e0b;">Servis Baru</h2>
            <p>Servis baru <strong>${serviceNumber}</strong> telah dibuat.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              ${customerName ? `<tr><td style="padding:4px 8px;color:#666;">Pelanggan</td><td style="padding:4px 8px;font-weight:600;">${customerName}</td></tr>` : ""}
              ${deviceInfo ? `<tr><td style="padding:4px 8px;color:#666;">Perangkat</td><td style="padding:4px 8px;font-weight:600;">${deviceInfo}</td></tr>` : ""}
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#f59e0b;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Servis</a>
          </div>`,
      };
    }

    default:
      return null;
  }
}

function formatRp(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

/* ── Resolve recipients ── */

async function resolveRecipients(
  adminDb: any,
  brandId: number,
  config: NotificationEventConfig,
): Promise<string[]> {
  const emails = new Set<string>();

  for (const email of config.emails) {
    if (email?.trim()) emails.add(email.trim());
  }

  if (config.roles.length > 0) {
    const { data: members } = await adminDb
      .from("user_brand_memberships")
      .select("profile_id")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .in("role", config.roles)
      .is("deleted_at", null);

    if (members && members.length > 0) {
      const profileIds = members.map((m: any) => m.profile_id);

      const { data: profiles } = await adminDb
        .from("profiles")
        .select("email")
        .in("id", profileIds);

      if (profiles) {
        for (const p of profiles) {
          if (p.email?.trim()) emails.add(p.email.trim());
        }
      }
    }
  }

  return Array.from(emails);
}

/* ── Log to notification_logs ── */

async function logNotification(
  adminDb: any,
  input: OperationalNotificationInput,
  recipientEmail: string,
  subject: string,
  status: string,
  errorMessage?: string,
): Promise<void> {
  try {
    await adminDb.from("notification_logs").insert({
      brand_id: input.brandId,
      branch_id: input.branchId ?? null,
      event_type: input.eventType,
      recipient_email: recipientEmail,
      subject,
      status,
      error_message: errorMessage ?? null,
      metadata: input.payload,
    });
  } catch (err) {
    console.error("[notification.service] Failed to log notification:", err);
  }
}

/* ── Main function ── */

export async function sendOperationalNotification(
  input: OperationalNotificationInput,
): Promise<void> {
  try {
    const adminDb = createServiceRoleSupabaseClient();

    /* Load brand settings */
    const settings = await getBrandSettings(adminDb as any, input.brandId);
    if (!settings) return;

    const notifSettings = settings.metadata?.notification_settings as NotificationSettings | undefined;
    if (!notifSettings?.emailEnabled) {
      await logNotification(adminDb, input, "", "", "SKIPPED", "Email notifications disabled");
      return;
    }

    const eventConfig = notifSettings.events[input.eventType] as NotificationEventConfig | undefined;
    if (!eventConfig?.enabled) {
      await logNotification(adminDb, input, "", "", "SKIPPED", `Event "${input.eventType}" not enabled`);
      return;
    }

    /* Build email content */
    const brandName = settings.storeName ?? "Seervis";
    const email = buildEmail(input.eventType, brandName, input.payload);
    if (!email) {
      await logNotification(adminDb, input, "", "", "SKIPPED", `No email template for "${input.eventType}"`);
      return;
    }

    /* Resolve recipients */
    const recipients = await resolveRecipients(adminDb, input.brandId, eventConfig);
    if (recipients.length === 0) {
      await logNotification(adminDb, input, "", "", "SKIPPED", "No recipients configured");
      return;
    }

    /* Send to each recipient */
    for (const emailAddr of recipients) {
      const result = await sendTransactionalEmail({
        to: [{ email: emailAddr }],
        subject: email.subject,
        htmlContent: email.html, // email.html is from buildEmail which returns { subject, html }

      });

      await logNotification(
        adminDb,
        input,
        emailAddr,
        email.subject,
        result.success ? "SENT" : "FAILED",
        result.error,
      );
    }
  } catch (err: any) {
    console.error("[notification.service] sendOperationalNotification error:", err);
  }
}
