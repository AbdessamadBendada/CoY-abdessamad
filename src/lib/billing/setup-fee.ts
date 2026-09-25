import { prisma } from '@/lib/prisma';
import type { Plan, BillingCycle } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import Stripe from 'stripe';

// Grille 3 paliers — migré le 2026-06-09 (suppression Essentiel, repositionnement prix)
export const SETUP_FEES: Record<Plan, number> = {
  ESSENTIEL:  0,      // @deprecated 2026-06-09 — palier supprimé, conservé pour compatibilité données
  STARTER:    14900,  // @deprecated 2026-09-05 — palier unique CoY, conservé pour compatibilité données
  CROISSANCE: 24900,  // @deprecated 2026-09-05 — idem
  EXPERT:     34900,  // @deprecated 2026-09-05 — idem
  COY:        49000,  // 490€ HT — forfait audit et session de lancement, Plan A
};

export const SETUP_LABELS: Record<Plan, string> = {
  ESSENTIEL:  '', // @deprecated 2026-06-09
  STARTER:    'Configuration initiale personnalisée', // @deprecated 2026-09-05
  CROISSANCE: 'Configuration initiale personnalisée', // @deprecated 2026-09-05
  EXPERT:     'Onboarding Expert dédié', // @deprecated 2026-09-05
  COY:        'Audit et session de lancement',
};

export async function createSetupFeeInvoiceItem(
  stripe: Stripe,
  customerId: string,
  tenantId: string,
  plan: Plan,
  billingCycle: BillingCycle,
): Promise<void> {
  // Plan A (05/09/2026) : seul le palier COY reste en vente — évite qu'un tenant
  // legacy (STARTER/CROISSANCE/EXPERT) avec setupFeeCharged=false se fasse facturer
  // un forfait déprécié lors d'une reprise de paiement (PAST_DUE → ACTIVE).
  if (plan !== 'COY') return;

  // Waivé sur facturation annuelle
  if (billingCycle === 'YEARLY') return;

  const amount = SETUP_FEES[plan];
  const label = SETUP_LABELS[plan];
  if (amount === 0) return; // pas de frais pour ce palier (ex : ESSENTIEL deprecated)
  if (!amount || !label) {
    throw new Error(`[setup-fee] plan inconnu: ${plan}`);
  }

  // Atomic claim — évite le double-appel en cas de retry webhook concurrent (TOCTOU fix)
  const claim = await prisma.tenant.updateMany({
    where: { id: tenantId, setupFeeCharged: false },
    data: { setupFeeCharged: true },
  });
  if (claim.count === 0) return;

  try {
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        amount,
        currency: 'eur',
        description: `${label} CoY — Palier ${plan}`,
      },
      { idempotencyKey: `setup-fee:${tenantId}` },
    );

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'SETUP_FEE_CHARGED',
        entityType: 'Tenant',
        entityId: tenantId,
        details: {
          plan,
          amountCents: amount,
          currency: 'eur',
          stripeCustomerId: customerId,
        } as PrismaTypes.InputJsonValue,
      },
    });
  } catch (err) {
    // Libérer le claim pour permettre un retry manuel
    try {
      await prisma.tenant.updateMany({
        where: { id: tenantId, setupFeeCharged: true },
        data: { setupFeeCharged: false },
      });
    } catch (rollbackErr) {
      console.error(`[setup-fee] CRITICAL: rollback échoué pour tenant ${tenantId}`, rollbackErr);
    }
    throw err;
  }
}
