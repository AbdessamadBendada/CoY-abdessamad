import type { BrevoSendResult } from "./send-email";

const BREVO_SMS_URL = "https://api.brevo.com/v3/transactionalSMS/send";

// ─── Normalisation numéro de téléphone → format international ─────────────────
// "06XXXXXXXX"  → "+336XXXXXXXX"
// "07XXXXXXXX"  → "+337XXXXXXXX"
// "0033XXXXXXX" → "+33XXXXXXX"
// "+33XXXXXXX"  → inchangé

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-\.\(\)]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0033")) return "+" + digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) return "+33" + digits.slice(1);
  return null; // format non reconnu
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrevoSmsPayload {
  toPhone: string;
  content: string;
}

// ─── Envoi SMS transactionnel Brevo ───────────────────────────────────────────

export async function sendBrevoSms(
  payload: BrevoSmsPayload
): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SMS_SENDER ?? "WinBack";

  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY non configuré" };
  }

  // RGPD + CNIL : obligation légale SMS France — le message DOIT contenir "STOP"
  if (!payload.content.includes("STOP")) {
    return { success: false, error: "SMS non conforme RGPD : mention STOP obligatoire absente" };
  }

  const recipient = normalizePhone(payload.toPhone);
  if (!recipient) {
    return {
      success: false,
      error: `Numéro de téléphone invalide ou non reconnu : ${payload.toPhone}`,
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
  const body = {
    sender,
    recipient,
    content: payload.content,
    ...(appUrl && webhookSecret
      ? { webUrl: `${appUrl}/api/webhooks/brevo?secret=${encodeURIComponent(webhookSecret)}` }
      : {}),
  };

  let response: Response;
  try {
    response = await fetch(BREVO_SMS_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { success: false, error: `Erreur réseau Brevo SMS : ${String(err)}` };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return {
      success: false,
      error: `Brevo SMS ${response.status}: ${errText.slice(0, 200)}`,
    };
  }

  let data: { messageId?: number | string } = {};
  try {
    data = (await response.json()) as { messageId?: number | string };
  } catch {
    // Brevo may return an empty success response; delivery remains successful.
  }

  return {
    success: true,
    messageId: data.messageId === undefined ? undefined : String(data.messageId),
  };
}

export type { BrevoSendResult };
