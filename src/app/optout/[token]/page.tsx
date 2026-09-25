import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── GET /optout/[token] ──────────────────────────────────────────────────────
// Page publique (hors dashboard) — accessible sans authentification.
// Permet au client final de se désinscrire des emails/SMS WinBack en un clic.

export default async function OptOutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const customer = await prisma.customer.findUnique({
    where: { optOutToken: token },
    select: { id: true, tenantId: true, optedOutAt: true },
  });

  if (!customer) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-semibold">Lien invalide</h1>
          <p className="text-muted-foreground">
            Ce lien de désinscription est invalide ou a déjà expiré.
          </p>
        </div>
      </main>
    );
  }

  // Opt-out idempotent — si déjà fait, afficher confirmation sans réécrire en DB
  if (!customer.optedOutAt) {
    const now = new Date();
    const farFuture = new Date(now.getTime() + 10 * 365 * 24 * 3600 * 1000);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        optedOutAt: now,
        cooldownUntil: farFuture,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: customer.tenantId,
        action: "CUSTOMER_OPTED_OUT",
        entityType: "Customer",
        entityId: customer.id,
        details: {
          source: "OPT_OUT_LINK",
        } as Prisma.InputJsonValue,
      },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h1 className="text-xl font-semibold">Désinscription confirmée</h1>
        <p className="text-muted-foreground">
          Vous ne recevrez plus de messages de récupération de notre part.
          Vos données restent protégées conformément au RGPD.
        </p>
      </div>
    </main>
  );
}
