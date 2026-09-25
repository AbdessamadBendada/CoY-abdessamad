import { stripe } from "@/lib/stripe/client";

// Palier unique CoY (Plan A) — Checkout partagé entre le parcours d'inscription
// (dpa/actions.ts, juste après signature DPA) et le repli dashboard
// (billing/actions.ts, si le Checkout initial n'a pas été complété).
export async function createCoyCheckoutSession(params: {
  tenantId: string;
  email: string;
  stripeCustomerId?: string | null;
}): Promise<{ url?: string; error?: string }> {
  const priceId = process.env.STRIPE_PRICE_COY_MONTHLY;

  if (!priceId) {
    return {
      error: "Le paiement n'est pas encore configuré. Contactez-nous à contact@coyia.fr.",
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: params.stripeCustomerId ?? undefined,
      customer_email: params.stripeCustomerId ? undefined : params.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 21,
        metadata: { tenantId: params.tenantId },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/overview?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancelled=1`,
      metadata: {
        tenantId: params.tenantId,
        plan: "coy",
        billingCycle: "MONTHLY",
      },
      allow_promotion_codes: true,
      locale: "fr",
    });

    return { url: session.url ?? undefined };
  } catch (err) {
    console.error("[checkout] createCoyCheckoutSession error:", err);
    return { error: "Erreur lors de la création de la session de paiement." };
  }
}
