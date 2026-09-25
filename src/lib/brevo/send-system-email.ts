import { sendBrevoEmail } from "./send-email";

export interface SystemEmailPayload {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

/**
 * Envoie un email système via Brevo — fire-and-forget.
 *
 * Ne bloque jamais la réponse HTTP.
 * Si BREVO_API_KEY est absent, log un warning et ne fait rien.
 */
export function sendSystemEmail(payload: SystemEmailPayload): void {
  sendBrevoEmail({
    toEmail: payload.to,
    toName: payload.toName ?? "",
    subject: payload.subject,
    htmlContent: payload.html,
  }).catch((err) => {
    console.error("[Brevo] Failed to send system email:", payload.subject, err);
  });
}
