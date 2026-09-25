// DEPRECATED 2026-06-09 — palier ESSENTIEL supprimé de la grille commerciale (migration 4 → 3 paliers)
// L'enum ESSENTIEL reste dans Prisma pour compatibilité des données existantes.

export const PLANS = {
  // ESSENTIEL: supprimé — voir @deprecated dans prisma/schema.prisma
  // starter/croissance/expert : @deprecated 2026-09-05 — palier unique CoY (Plan A).
  // Conservés pour compatibilité des tenants legacy déjà en base, plus jamais rendus
  // en UI (pricing-section.tsx, /tarifs, dashboard n'affichent plus que `coy`).
  starter: {
    name: "Starter",
    description: "Pour les PME en croissance — CA 500k-1M€",
    price_monthly: 299_00,   // centimes EUR
    price_yearly: 2_868_00,  // 239€/mois × 12
    price_monthly_display: "299€",
    price_yearly_display: "239€",
    setup_fee: 149_00,       // one-time, offert sur annuel
    features: [
      "2 500 clients surveillés",
      "250 actions/mois",
      "Email + SMS (50/mois)",
      "5 scénarios prédéfinis",
      "2 intégrations au choix",
      "Support email (72h)",
    ],
    cta: "Essayer 21 jours gratuits →",
    popular: false,
  },
  croissance: {
    name: "Croissance",
    description: "Optimisé pour la performance — CA 1M-3M€",
    price_monthly: 599_00,
    price_yearly: 5_748_00,  // 479€/mois × 12
    price_monthly_display: "599€",
    price_yearly_display: "479€",
    setup_fee: 249_00,
    features: [
      "6 000 clients surveillés",
      "750 actions/mois",
      "Email + SMS (200/mois) + chat",
      "15 scénarios personnalisables",
      "4 intégrations au choix",
      "Support email (48h)",
    ],
    cta: "Démarrer — ROI max. dès le 1er mois →",
    popular: true,
  },
  expert: {
    name: "Expert",
    description: "Pour les leaders e-commerce — CA 2M-5M€",
    price_monthly: 899_00,
    price_yearly: 8_628_00,  // 719€/mois × 12
    price_monthly_display: "899€",
    price_yearly_display: "719€",
    setup_fee: 349_00,
    features: [
      "15 000 clients surveillés",
      "2 500 actions/mois",
      "Email + SMS (500/mois) + WhatsApp",
      "25 scénarios personnalisables",
      "Dashboard complet + alertes ROI",
      "CSM dédié — SLA 24h",
    ],
    cta: "Contacter l'équipe →",
    popular: false,
  },
  // Palier unique CoY (Plan A, 05/09/2026) — mensuel uniquement, pas d'annuel.
  // price_yearly/price_yearly_display sont des valeurs inertes (jamais rendues — COY
  // n'a pas de cycle annuel) posées uniquement pour satisfaire la forme structurelle
  // partagée par les Record<PlanKey,…> exhaustifs (ex: pricing-section.tsx).
  coy: {
    name: "CoY",
    description: "Palier unique — PME e-commerce CA 1M-5M€",
    price_monthly: 899_00,
    price_yearly: 899_00 * 12,
    price_monthly_display: "899€",
    price_yearly_display: "899€",
    setup_fee: 490_00,
    features: [
      "10 000 clients surveillés",
      "1 500 actions/mois",
      "Email + SMS (350/mois)",
      "25 scénarios personnalisables",
      "Intégrations illimitées",
      "Les 7 triggers comportementaux",
    ],
    cta: "Essayer 21 jours gratuits →",
    popular: false,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const TRIAL_DURATION_DAYS = 21;
export const TRIAL_EXTENSION_DAYS = 7; // si non activé à J14
export const ANNUAL_DISCOUNT_PERCENT = 20;

// Price IDs Stripe : voir STRIPE_PRICE_COY_MONTHLY (scripts/stripe-setup.ts, sous-lot 4.1) — déjà créés.
//                        price_croissance_monthly, price_croissance_yearly, price_croissance_setup
//                        price_expert_monthly, price_expert_yearly, price_expert_setup
