"use server";

import { requireAuth } from "@/lib/auth";
import { createCoyCheckoutSession } from "@/lib/billing/checkout";
import { canManageBilling } from "@/lib/security/roles";

// Repli dashboard : si le Checkout déclenché juste après la signature DPA
// (dpa/actions.ts) n'a pas été complété, ce CTA (plan-selector.tsx, onglet
// Billing) permet de le relancer. Palier unique CoY — plus de paramètre
// planKey/billingCycle depuis Plan A (05/09/2026).
export async function createCheckoutSession(): Promise<{ url?: string; error?: string }> {
  const user = await requireAuth();
  if (!canManageBilling(user.role)) {
    return { error: "Seul le propriétaire du compte peut modifier l'abonnement." };
  }
  const tenant = user.tenant;

  if (!tenant.dpaSignedAt) {
    return {
      error:
        "Vous devez signer votre accord de traitement des données avant d'activer un plan payant. Rendez-vous sur la page DPA pour finaliser votre inscription.",
    };
  }

  return createCoyCheckoutSession({
    tenantId: tenant.id,
    email: tenant.email,
    stripeCustomerId: tenant.stripeCustomerId,
  });
}
