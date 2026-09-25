"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { createCheckoutSession } from "../actions";

interface Props {
  // TenantStatus Prisma — "TRIAL" tant que le Checkout initial n'a pas été
  // complété (dpa/actions.ts). Une fois ACTIVE/PAST_DUE/CANCELLED/SUSPENDED,
  // un abonnement existe déjà : ce CTA de repli n'a plus lieu d'être proposé.
  status: string;
}

export function PlanSelector({ status }: Props) {
  const [isPending, startTransition] = useTransition();
  const plan = PLANS.coy;

  function handleCheckout() {
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error ?? "Erreur lors de la création de la session de paiement.");
      }
    });
  }

  if (status !== "TRIAL") {
    return (
      <p className="text-sm text-muted-foreground">
        Vous êtes déjà abonné au palier CoY — rien à changer ici.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="relative flex flex-col max-w-md">
        <CardHeader className="pb-3 pt-6">
          <CardTitle className="text-base">{plan.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{plan.description}</p>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 gap-4">
          <div>
            <span className="text-2xl font-bold">{plan.price_monthly_display}</span>
            <span className="text-sm text-muted-foreground">/mois</span>
          </div>

          <ul className="space-y-1.5 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 shrink-0" style={{ color: "#5C8A3A" }}>
                  ✓
                </span>
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            variant="default"
            className="w-full text-sm"
            onClick={handleCheckout}
            disabled={isPending}
          >
            {isPending ? "Redirection..." : "Finaliser mon abonnement"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Paiement sécurisé via Stripe. Factur-X (norme française) inclus.
        Résiliable à tout moment.
      </p>
    </div>
  );
}
