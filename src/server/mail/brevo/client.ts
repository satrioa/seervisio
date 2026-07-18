import type { BrevoConfig, BrevoSendEmailParams, BrevoApiResponse } from "./types";

let config: BrevoConfig | null = null;

export function configureBrevo(apiKey: string) {
  config = {
    apiKey,
    baseUrl: "https://api.brevo.com/v3",
  };
}

export function getBrevoConfig(): BrevoConfig {
  if (!config) {
    const key = process.env.BREVO_API_KEY;
    if (!key) {
      throw new Error("BREVO_API_KEY environment variable is not set");
    }
    config = { apiKey: key, baseUrl: "https://api.brevo.com/v3" };
  }
  return config;
}

export async function brevoSendTransactionalEmail(
  params: BrevoSendEmailParams,
): Promise<BrevoApiResponse> {
  const cfg = getBrevoConfig();

  const body: Record<string, unknown> = {
    to: params.to.map((r) => ({ email: r.email, name: r.name ?? r.email })),
    subject: params.subject,
    htmlContent: params.htmlContent,
    sender: params.sender ?? { email: "noreply@seervisio.com", name: "Seervisio" },
  };

  if (params.replyTo) {
    body.replyTo = { email: params.replyTo.email, name: params.replyTo.name };
  }

  if (params.attachment && params.attachment.length > 0) {
    body.attachment = params.attachment;
  }

  if (params.tags && params.tags.length > 0) {
    body.tags = params.tags;
  }

  if (params.headers) {
    body.headers = params.headers;
  }

  const response = await fetch(`${cfg.baseUrl}/smtp/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": cfg.apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Brevo API error (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();
  return { messageId: data.messageId };
}
