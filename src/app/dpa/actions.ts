"use server";

import { requireAuth } from "@/features/auth/server";
import { prisma } from "@/shared/db/prisma";
import { redirect } from "next/navigation";
import { createCoyCheckoutSession } from "@/features/billing/services/checkout";
import { canManageBilling } from "@/shared/security/events/roles";

export async function acceptDpa() {
  const user = await requireAuth();
  if (!canManageBilling(user.role)) redirect("/overview");

  await prisma.tenant.update({
    where: { id: user.tenant.id },
    data: { dpaSignedAt: new Date() },
  });

  const result = await createCoyCheckoutSession({
    tenantId: user.tenant.id,
    email: user.tenant.email,
    stripeCustomerId: user.tenant.stripeCustomerId,
  });

  // Repli si le Checkout ne peut pas être créé (config manquante, erreur Stripe) :
  // le DPA reste signé, le tenant reste en essai. Le CTA "Finaliser mon abonnement"
  // dans l'onglet Billing (plan-selector.tsx) reprend le même appel plus tard.
  redirect(result.url ?? "/overview");
}
