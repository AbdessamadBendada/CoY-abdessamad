"use server";

import { sendSystemEmail } from "@/features/messaging/brevo/send-system-email";
import { escapeHtml } from "@/shared/utils/escape-html";
import { isContactRateLimited } from "@/shared/utils/rate-limit";

export type ContactIntent = "question" | "demo" | "partenariat" | "support";

const INTENT_LABELS: Record<ContactIntent, string> = {
  question:    "❓ Question générale",
  demo:        "🎯 Demande de démo",
  partenariat: "🤝 Partenariat",
  support:     "🛠️ Support technique",
};

export async function submitContact(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const intent = formData.get("intent") as ContactIntent | null;
  const name = (formData.get("name") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim();
  const company = (formData.get("company") as string | null)?.trim();
  const message = (formData.get("message") as string | null)?.trim();

  if (await isContactRateLimited()) {
    return { error: "Trop de demandes. Veuillez patienter quelques minutes." };
  }

  if (!intent || !INTENT_LABELS[intent]) {
    return { error: "Veuillez sélectionner une intention." };
  }
  if (!name || !email || !company || !message) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }

  const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
  if (!alertEmail) {
    console.warn("[Contact] INTERNAL_ALERT_EMAIL non configuré");
    return { success: true };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCompany = escapeHtml(company);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  sendSystemEmail({
    to: alertEmail,
    subject: `[WinBack] ${INTENT_LABELS[intent]} — ${safeCompany}`,
    html: `
      <h2 style="color:#2563eb;margin-bottom:16px">📬 Nouvelle demande de contact</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
        <tr>
          <td style="padding:8px 12px;font-weight:600;background:#f3f4f6;border:1px solid #e5e7eb;width:140px">Intention</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb"><strong>${INTENT_LABELS[intent]}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;background:#f3f4f6;border:1px solid #e5e7eb">Nom</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb">${safeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;background:#f3f4f6;border:1px solid #e5e7eb">Email</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb">
            <a href="mailto:${safeEmail}" style="color:#2563eb">${safeEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;background:#f3f4f6;border:1px solid #e5e7eb">Entreprise</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb">${safeCompany}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;background:#f3f4f6;border:1px solid #e5e7eb">Message</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb">${safeMessage}</td>
        </tr>
      </table>
      <p style="margin-top:16px;color:#6b7280;font-size:12px">
        Répondre directement à : <a href="mailto:${safeEmail}" style="color:#2563eb">${safeEmail}</a>
      </p>
    `,
  });

  return { success: true };
}
