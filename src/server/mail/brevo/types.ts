export interface BrevoConfig {
  apiKey: string;
  baseUrl: string;
}

export interface BrevoAttachment {
  name: string;
  content: string;
}

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface BrevoSendEmailParams {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  sender?: BrevoRecipient;
  replyTo?: BrevoRecipient;
  attachment?: BrevoAttachment[];
  tags?: string[];
  headers?: Record<string, string>;
}

export interface BrevoApiResponse {
  messageId: string;
  code?: string;
  message?: string;
}
