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

    case "AUTO_CLOSE": {
      const branch = payload.branchName ?? "";
      const shiftNumber = payload.shiftNumber ?? "";
      const lateMin = payload.lateMinutes ?? 0;
      const hours = Math.floor(lateMin / 60);
      const mins = lateMin % 60;
      const shiftDurationText = `${hours}h ${mins}m`;
      return {
        subject: `[${brandName}] Store automatically closed — ${branch}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#dc2626;">Store Automatically Closed</h2>
            <p>Store <strong>${branch}</strong> was automatically closed because it exceeded operational hours.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Shift</td><td style="padding:4px 8px;font-weight:600;">${shiftNumber}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Shift Duration</td><td style="padding:4px 8px;font-weight:600;">${shiftDurationText}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Late By</td><td style="padding:4px 8px;font-weight:600;color:#dc2626;">${lateMin} minutes</td></tr>
            </table>
            <p style="color:#888;font-size:12px;">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>`,
      };
    }

    case "STORE_OVERDUE": {
      const branch = payload.branchName ?? "";
      const lateMin = payload.lateMinutes ?? 0;
      return {
        subject: `[${brandName}] Store still open after hours — ${branch}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#f59e0b;">Store Still Open</h2>
            <p>Store <strong>${branch}</strong> has exceeded operational hours by <strong>${lateMin} minutes</strong> and is still open.</p>
            <p style="color:#666;font-size:13px;">The store will be automatically closed once the grace period is exceeded.</p>
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

    case "SERVICE_STATUS_CHANGED": {
      const serviceNumber = payload.serviceNumber ?? "";
      const customerName = payload.customerName ?? "";
      const fromStatus = payload.fromStatus ?? "";
      const toStatus = payload.toStatus ?? "";
      const deviceInfo = [payload.deviceType, payload.deviceBrand, payload.deviceModel].filter(Boolean).join(" ");
      return {
        subject: `[${brandName}] Status servis berubah — ${serviceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#3b82f6;">Status Servis Berubah</h2>
            <p>Servis <strong>${serviceNumber}</strong> berubah status.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              ${fromStatus ? `<tr><td style="padding:4px 8px;color:#666;">Dari</td><td style="padding:4px 8px;font-weight:600;">${fromStatus}</td></tr>` : ""}
              <tr><td style="padding:4px 8px;color:#666;">Ke</td><td style="padding:4px 8px;font-weight:600;">${toStatus}</td></tr>
              ${customerName ? `<tr><td style="padding:4px 8px;color:#666;">Pelanggan</td><td style="padding:4px 8px;font-weight:600;">${customerName}</td></tr>` : ""}
              ${deviceInfo ? `<tr><td style="padding:4px 8px;color:#666;">Perangkat</td><td style="padding:4px 8px;font-weight:600;">${deviceInfo}</td></tr>` : ""}
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Servis</a>
          </div>`,
      };
    }

    case "TECHNICIAN_ASSIGNED": {
      const serviceNumber = payload.serviceNumber ?? "";
      const technicianName = payload.technicianName ?? "";
      const customerName = payload.customerName ?? "";
      const deviceInfo = [payload.deviceType, payload.deviceBrand, payload.deviceModel].filter(Boolean).join(" ");
      return {
        subject: `[${brandName}] Teknisi ditugaskan — ${serviceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#8b5cf6;">Teknisi Ditugaskan</h2>
            <p>Teknisi telah ditugaskan untuk servis <strong>${serviceNumber}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Teknisi</td><td style="padding:4px 8px;font-weight:600;">${technicianName}</td></tr>
              ${customerName ? `<tr><td style="padding:4px 8px;color:#666;">Pelanggan</td><td style="padding:4px 8px;font-weight:600;">${customerName}</td></tr>` : ""}
              ${deviceInfo ? `<tr><td style="padding:4px 8px;color:#666;">Perangkat</td><td style="padding:4px 8px;font-weight:600;">${deviceInfo}</td></tr>` : ""}
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Servis</a>
          </div>`,
      };
    }

    case "OPEN_SHIFT": {
      const branch = payload.branchName ?? "";
      const shiftNumber = payload.shiftNumber ?? "";
      const openingCash = formatRp(payload.openingCash ?? 0);
      return {
        subject: `[${brandName}] Shift dibuka — ${branch}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#16a34a;">Shift Dibuka</h2>
            <p>Shift <strong>${shiftNumber}</strong> di <strong>${branch}</strong> telah dibuka.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Kas awal</td><td style="padding:4px 8px;font-weight:600;">${openingCash}</td></tr>
            </table>
            <p style="color:#888;font-size:12px;">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>`,
      };
    }

    case "POS_TRANSACTION_CREATED": {
      const transactionNumber = payload.transactionNumber ?? "";
      const amount = formatRp(payload.amount ?? 0);
      const paymentMethod = payload.paymentMethod ?? "";
      return {
        subject: `[${brandName}] Transaksi POS — ${transactionNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#f59e0b;">Transaksi POS Baru</h2>
            <p>Transaksi <strong>${transactionNumber}</strong> telah dibuat.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Total</td><td style="padding:4px 8px;font-weight:600;font-size:18px;">${amount}</td></tr>
              ${paymentMethod ? `<tr><td style="padding:4px 8px;color:#666;">Metode</td><td style="padding:4px 8px;font-weight:600;">${paymentMethod}</td></tr>` : ""}
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#f59e0b;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Transaksi</a>
          </div>`,
      };
    }

    case "LOW_STOCK": {
      const itemName = payload.itemName ?? "";
      const currentStock = payload.currentStock ?? 0;
      const threshold = payload.threshold ?? 0;
      const branch = payload.branchName ?? "";
      return {
        subject: `[${brandName}] Stok menipis — ${itemName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#dc2626;">Stok Menipis</h2>
            <p>Stok <strong>${itemName}</strong> di <strong>${branch}</strong> hampir habis.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Sisa stok</td><td style="padding:4px 8px;font-weight:600;">${currentStock}</td></tr>
              <tr><td style="padding:4px 8px;color:#666;">Batas minimum</td><td style="padding:4px 8px;font-weight:600;">${threshold}</td></tr>
            </table>
            <a href="${appUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Lihat Stok</a>
          </div>`,
      };
    }

    case "ACCOUNT_CHANGED": {
      const changeType = payload.changeType ?? "";
      const changedByName = payload.changedByName ?? "";
      const targetEmail = payload.targetEmail ?? "";
      const roleName = payload.roleName ?? "";
      return {
        subject: `[${brandName}] Perubahan akun — ${changeType}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#f59e0b;">Perubahan Akun</h2>
            <p>Telah terjadi perubahan akun di <strong>${brandName}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;">
              <tr><td style="padding:4px 8px;color:#666;">Jenis</td><td style="padding:4px 8px;font-weight:600;">${changeType}</td></tr>
              ${changedByName ? `<tr><td style="padding:4px 8px;color:#666;">Oleh</td><td style="padding:4px 8px;font-weight:600;">${changedByName}</td></tr>` : ""}
              ${targetEmail ? `<tr><td style="padding:4px 8px;color:#666;">Akun</td><td style="padding:4px 8px;font-weight:600;">${targetEmail}</td></tr>` : ""}
              ${roleName ? `<tr><td style="padding:4px 8px;color:#666;">Role</td><td style="padding:4px 8px;font-weight:600;">${roleName}</td></tr>` : ""}
            </table>
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

    console.log("[notification:event] Processing", {
      eventType: input.eventType,
      brandId: input.brandId,
      branchId: input.branchId ?? null,
    });

    const settings = await getBrandSettings(adminDb as any, input.brandId);
    if (!settings) {
      console.log("[notification:event] SKIPPED — brand_settings not found", { eventType: input.eventType, brandId: input.brandId });
      return;
    }

    const notifSettings = settings.metadata?.notification_settings as NotificationSettings | undefined;
    if (!notifSettings?.emailEnabled) {
      console.log("[notification:event] SKIPPED — email notifications disabled", { eventType: input.eventType });
      await logNotification(adminDb, input, "", "", "SKIPPED", "Email notifications disabled");
      return;
    }

    const eventConfig = notifSettings.events[input.eventType] as NotificationEventConfig | undefined;
    if (!eventConfig?.enabled) {
      console.log("[notification:event] SKIPPED — event not enabled", { eventType: input.eventType });
      await logNotification(adminDb, input, "", "", "SKIPPED", `Event "${input.eventType}" not enabled`);
      return;
    }

    const { data: brandRow } = await adminDb.from("brands").select("name").eq("id", input.brandId).maybeSingle();
    const brandName = brandRow?.name ?? "Seervis";
    const email = buildEmail(input.eventType, brandName, input.payload);
    if (!email) {
      console.log("[notification:event] SKIPPED — no email template", { eventType: input.eventType });
      await logNotification(adminDb, input, "", "", "SKIPPED", `No email template for "${input.eventType}"`);
      return;
    }

    const recipients = await resolveRecipients(adminDb, input.brandId, eventConfig);
    if (recipients.length === 0) {
      console.log("[notification:event] SKIPPED — no recipients", { eventType: input.eventType });
      await logNotification(adminDb, input, "", "", "SKIPPED", "No recipients configured");
      return;
    }

    console.log("[notification:event] Sending", {
      eventType: input.eventType,
      recipientCount: recipients.length,
      recipients: recipients,
    });

    for (const emailAddr of recipients) {
      console.log("[notification:email] Sending to", { to: emailAddr, subject: email.subject });
      const result = await sendTransactionalEmail({
        to: [{ email: emailAddr }],
        subject: email.subject,
        htmlContent: email.html,
      });

      console.log("[notification:email] Result", {
        to: emailAddr,
        success: result.success,
        messageId: result.messageId,
        error: result.error ?? null,
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
    console.error("[notification:error] sendOperationalNotification failed:", {
      eventType: input.eventType,
      brandId: input.brandId,
      error: err.message,
      stack: err.stack,
    });
  }
}
