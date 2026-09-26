const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BrevoEmailPayload {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

// ─── Envoi email transactionnel Brevo ─────────────────────────────────────────

export async function sendBrevoEmail(
  payload: BrevoEmailPayload
): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ?? "noreply@coyia.fr";

  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY non configuré" };
  }

  const body = {
    sender: { name: "CoY · Winback Agent", email: senderEmail },
    to: [{ email: payload.toEmail, name: payload.toName }],
    subject: payload.subject,
    htmlContent: payload.htmlContent,
  };

  let response: Response;
  try {
    response = await fetch(BREVO_EMAIL_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { success: false, error: `Erreur réseau Brevo : ${String(err)}` };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return {
      success: false,
      error: `Brevo email ${response.status}: ${errText.slice(0, 200)}`,
    };
  }

  let data: { messageId?: string } = {};
  try {
    data = (await response.json()) as { messageId?: string };
  } catch {
    // Réponse non-JSON mais statut OK — considérer comme succès
  }

  return { success: true, messageId: data.messageId };
}
