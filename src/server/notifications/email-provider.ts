// src/server/notifications/email-provider.ts

type SendTransactionalEmailInput = {
  to: {
    email: string;
    name?: string | null;
  }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
};

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_EMAIL;
  const fromName = process.env.EMAIL_FROM_NAME ?? "Seervis";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  if (!fromEmail) {
    throw new Error("EMAIL_FROM_EMAIL is not configured");
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: fromName,
        },
        to: input.to.map((recipient) => ({
          email: recipient.email,
          name: recipient.name ?? recipient.email,
        })),
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: `Brevo email failed: ${response.status} ${JSON.stringify(result)}`,
      };
    }

    return {
      success: true,
      messageId: result?.messageId ?? null,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      messageId: null,
      error: err.message ?? "Unknown error",
    };
  }
}