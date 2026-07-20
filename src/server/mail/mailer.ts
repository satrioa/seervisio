import React from "react";
import { render } from "@react-email/components";
import { brevoSendTransactionalEmail } from "./brevo/send-email";
import { insertEmailLog, updateEmailLogStatus } from "./email-log.repository";
import { renderWelcomeEmail } from "./templates/welcome-email";
import { renderPaymentPendingEmail } from "./templates/payment-pending";
import { renderPaymentApprovedEmail } from "./templates/payment-approved";
import { renderInvoiceEmail } from "./templates/invoice-email";
import { renderLicenseExpiringEmail } from "./templates/license-expiring";
import { renderLicenseExpiredEmail } from "./templates/license-expired";
import { renderLicenseRejectedEmail } from "./templates/license-rejected";
import { renderResetPasswordEmail } from "./templates/reset-password";
import type { BrevoAttachment, BrevoApiResponse } from "./brevo/types";

export type EmailTemplate =
  | "welcome-email"
  | "payment-pending"
  | "payment-approved"
  | "invoice-email"
  | "license-expiring"
  | "license-expired"
  | "license-rejected"
  | "reset-password";

export interface MailSendParams {
  to: string;
  toName?: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  attachments?: BrevoAttachment[];
  tags?: string[];
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  logId?: string;
  error?: string;
}

const TEMPLATES: Record<EmailTemplate, (data: Record<string, unknown>) => React.ReactElement> = {
  "welcome-email": (d) => renderWelcomeEmail(d as any),
  "payment-pending": (d) => renderPaymentPendingEmail(d as any),
  "payment-approved": (d) => renderPaymentApprovedEmail(d as any),
  "invoice-email": (d) => renderInvoiceEmail(d as any),
  "license-expiring": (d) => renderLicenseExpiringEmail(d as any),
  "license-expired": (d) => renderLicenseExpiredEmail(d as any),
  "license-rejected": (d) => renderLicenseRejectedEmail(d as any),
  "reset-password": (d) => renderResetPasswordEmail(d as any),
};

async function sendMail(params: MailSendParams): Promise<MailSendResult> {
  const logId = await insertEmailLog({
    recipient: params.to,
    subject: params.subject,
    template: params.template,
    provider: "brevo",
    status: "retry",
    metadata: params.data,
  });

  try {
    const renderFn = TEMPLATES[params.template];
    if (!renderFn) {
      throw new Error(`Unknown email template: ${params.template}`);
    }

    const component = renderFn(params.data);
    const htmlContent = await render(component);

    const result: BrevoApiResponse = await brevoSendTransactionalEmail({
      to: [{ email: params.to, name: params.toName }],
      subject: params.subject,
      htmlContent,
      tags: params.tags ?? [params.template],
      attachment: params.attachments,
    });

    if (logId) {
      await updateEmailLogStatus(logId, "success", undefined, result.messageId);
    }

    return { success: true, messageId: result.messageId, logId: logId ?? undefined };
  } catch (error: any) {
    const errorMsg = error.message || "Unknown error";

    if (logId) {
      await updateEmailLogStatus(logId, "failed", errorMsg);
    }

    console.error(`[Mailer] Failed to send ${params.template} to ${params.to}:`, errorMsg);

    return { success: false, error: errorMsg, logId: logId ?? undefined };
  }
}

export const Mailer = {
  send: sendMail,
};
