import { createJobsClient } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo/send-email";

export async function runDpaReminderSequence(): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const prisma = createJobsClient();
  const now = new Date();
  const results = { sent: 0, skipped: 0, errors: 0 };

  try {
    const tenants = await prisma.tenant.findMany({
      where: { dpaSignedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    for (const tenant of tenants) {
      const daysSinceCreation = Math.floor(
        (now.getTime() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      let subject: string | null = null;
      let htmlContent: string | null = null;

      if (daysSinceCreation >= 14) {
        subject = "⚠️ Finalisez votre inscription WinBack — dernier rappel DPA";
        htmlContent = `<p>Bonjour ${tenant.name},</p><p>Votre accès CoY · Winback Agent est actif, mais sans DPA signé les actions de récupération restent désactivées et vous ne pourrez pas activer de plan payant.</p><p>C'est rapide — moins de 2 minutes.</p><p><strong><a href="${process.env.NEXT_PUBLIC_APP_URL}/dpa">Signer le DPA maintenant →</a></strong></p><p>Cordialement,<br>L'équipe CoYia</p>`;
      } else if (daysSinceCreation >= 7) {
        subject = "Finalisez votre inscription WinBack — 2e rappel DPA";
        htmlContent = `<p>Bonjour ${tenant.name},</p><p>Pour activer l'envoi d'actions de récupération et accéder aux plans payants, vous devez signer votre accord de traitement des données (DPA RGPD).</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dpa">Signer le DPA →</a></p><p>Cordialement,<br>L'équipe CoYia</p>`;
      } else if (daysSinceCreation >= 3) {
        subject = "Finalisez votre inscription WinBack — Signez votre DPA";
        htmlContent = `<p>Bonjour ${tenant.name},</p><p>Pour commencer à récupérer vos clients à risque, une dernière étape : signez votre accord de traitement des données (DPA RGPD). C'est rapide et obligatoire avant l'envoi d'actions.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dpa">Signer le DPA →</a></p><p>Cordialement,<br>L'équipe CoYia</p>`;
      }

      if (!subject || !htmlContent) {
        results.skipped++;
        continue;
      }

      if (!process.env.BREVO_API_KEY) {
        console.log(`[dpa-reminder] BREVO absent — rappel simulé pour ${tenant.email}`);
        results.skipped++;
        continue;
      }

      try {
        const result = await sendBrevoEmail({
          toEmail: tenant.email,
          toName: tenant.name,
          subject,
          htmlContent,
        });
        if (result.success) {
          results.sent++;
        } else {
          results.errors++;
        }
      } catch {
        results.errors++;
      }
    }

    return results;
  } finally {
    await prisma.$disconnect();
  }
}
