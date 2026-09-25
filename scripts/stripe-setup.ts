/**
 * stripe-setup.ts
 * Crée les produits et prix WinBack Agent dans Stripe (mode test)
 * et écrit les Price IDs dans .env.local.
 *
 * Usage : npm run stripe:setup
 * Idempotent — peut être relancé sans créer de doublons.
 */

import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import Stripe from "stripe";

// ─── Chargement de .env.local ─────────────────────────────────────────────────

const ENV_PATH = path.join(process.cwd(), ".env.local");
config({ path: ENV_PATH });

// ─── Définition des plans ─────────────────────────────────────────────────────
// Palier unique CoY (Plan A, 05/09/2026) — mensuel uniquement, pas de cycle annuel.

const PLANS = [
  {
    key: "coy",
    envKey: "COY",
    name: "CoY — l'agent Winback de CoYia",
    description: "Palier unique — PME e-commerce CA 1M-5M€",
    monthly: 89_900, // 899€/mois en centimes
  },
] as const;

// ─── Mise à jour de .env.local ────────────────────────────────────────────────

function updateEnvLocal(updates: Record<string, string>): void {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`❌  ${ENV_PATH} introuvable — créez-le avant de lancer ce script (voir .env.example).`);
    process.exit(1);
  }

  let content = fs.readFileSync(ENV_PATH, "utf-8");

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      // Ajouter après la section # --- Stripe ---
      const stripeSection = "# --- Stripe ---";
      if (content.includes(stripeSection)) {
        const stripeIndex = content.indexOf(stripeSection);
        const nextSection = content.indexOf("\n# ---", stripeIndex + 1);
        const insertAt =
          nextSection !== -1 ? nextSection : content.length;
        content =
          content.slice(0, insertAt) +
          `\n${key}=${value}` +
          content.slice(insertAt);
      } else {
        content += `\n${key}=${value}`;
      }
    }
  }

  fs.writeFileSync(ENV_PATH, content, "utf-8");
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error("❌  STRIPE_SECRET_KEY manquant dans .env.local");
    process.exit(1);
  }

  const isLive = stripeKey.startsWith("sk_live_");
  const isTest = stripeKey.startsWith("sk_test_");

  if (!isLive && !isTest) {
    console.error("❌  STRIPE_SECRET_KEY invalide — doit commencer par sk_live_ ou sk_test_");
    process.exit(1);
  }

  if (isLive) {
    console.warn("⚠️   MODE LIVE — les produits et prix seront créés en production Stripe.");
    console.warn("     Ctrl+C pour annuler, ou attendez 5 secondes pour continuer...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

  console.log(`🚀  Démarrage du setup Stripe WinBack Agent (mode ${isLive ? "LIVE" : "test"})\n`);

  const priceIds: Record<string, string> = {};

  for (const plan of PLANS) {
    console.log(`📦  Plan ${plan.name}`);

    // ── Trouver ou créer le produit ────────────────────────────────────────
    let product: Stripe.Product;

    const existingProducts = await stripe.products.search({
      query: `metadata["winback_plan"]:"${plan.key}"`,
    });

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`    ↳ Produit existant : ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { winback_plan: plan.key },
      });
      console.log(`    ↳ Produit créé    : ${product.id}`);
    }

    // ── Trouver ou créer les prix ──────────────────────────────────────────
    // CoY est mensuel uniquement (Plan A, 05/09/2026) — pas de cycle annuel.
    const cycles = [
      {
        cycle: "monthly" as const,
        amount: plan.monthly,
        interval: "month" as const,
        envSuffix: "MONTHLY",
        label: "mensuel",
      },
    ];

    for (const { cycle, amount, interval, envSuffix, label } of cycles) {
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      const existingPrice = existingPrices.data.find(
        (p) => p.metadata?.winback_cycle === cycle
      );

      let price: Stripe.Price;

      if (existingPrice) {
        price = existingPrice;
        console.log(`    ↳ Prix ${label} existant : ${price.id}`);
      } else {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: amount,
          currency: "eur",
          recurring: { interval },
          metadata: {
            winback_cycle: cycle,
            winback_plan: plan.key,
          },
        });
        console.log(`    ↳ Prix ${label} créé    : ${price.id}`);
      }

      priceIds[`STRIPE_PRICE_${plan.envKey}_${envSuffix}`] = price.id;
    }

    console.log("");
  }

  // ── Écriture dans .env.local ───────────────────────────────────────────────
  updateEnvLocal(priceIds);

  const count = Object.keys(priceIds).length;
  console.log(`✅  .env.local mis à jour avec ${count} Price ID(s) Stripe :\n`);
  for (const [key, value] of Object.entries(priceIds)) {
    console.log(`   ${key}=${value}`);
  }
  console.log(
    "\n⚡  Redémarrez le serveur de développement pour appliquer les changements :"
  );
  console.log("   npm run dev\n");
}

main().catch((err) => {
  console.error("❌  Erreur fatale :", err.message ?? err);
  process.exit(1);
});
