import { prisma } from "@/lib/prisma";
import type { SecurityEventType, SecuritySeverity } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { sendSystemEmail } from "@/lib/brevo/send-system-email";

export type { SecurityEventType, SecuritySeverity };

interface LogSecurityEventParams {
  event: SecurityEventType;
  severity?: SecuritySeverity;
  tenantId?: string;
  request?: Request;
  details?: Prisma.InputJsonValue;
}

/**
 * Log un événement de sécurité.
 *
 * Retourne une Promise — await obligatoire dans les routes Vercel pour éviter
 * que la fonction serverless soit terminée avant que l'écriture DB n'arrive à terme.
 *
 * Usage :
 *   await logSecurityEvent({ event: "HMAC_FAILURE", tenantId, request, details: { reason } });
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function logSecurityEvent({
  event,
  severity = "MEDIUM",
  tenantId,
  request,
  details,
}: LogSecurityEventParams): Promise<void> {
  const ipAddress = request
    ? (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
       request.headers.get("x-real-ip") ??
       null)
    : null;

  const userAgent = request ? request.headers.get("user-agent") : null;

  const path = request ? new URL(request.url).pathname : null;

  // Alerte email pour les événements CRITICAL
  if (severity === "CRITICAL") {
    const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
    if (alertEmail) {
      sendSystemEmail({
        to: alertEmail,
        subject: `[WinBack] Alerte sécurité CRITICAL : ${event}`,
        html: `
          <h2 style="color:#dc2626">⚠️ Événement de sécurité CRITICAL</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:4px 8px;font-weight:bold">Événement</td><td style="padding:4px 8px">${event}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold">Tenant</td><td style="padding:4px 8px">${tenantId ?? "—"}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold">IP</td><td style="padding:4px 8px">${ipAddress ?? "inconnue"}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold">Path</td><td style="padding:4px 8px">${path ?? "—"}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:bold">Détails</td><td style="padding:4px 8px"><pre>${JSON.stringify(details, null, 2)}</pre></td></tr>
          </table>
        `,
      });
    }
  }

  await prisma.securityEvent
    .create({
      data: {
        event,
        severity,
        tenantId: tenantId ?? null,
        ipAddress,
        userAgent,
        path,
        details: details,
      },
    })
    .catch((err) => {
      console.error("[SecurityEvent] Failed to log security event:", event, err);
    });
}
