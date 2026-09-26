import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Activer avec : ANALYZE=true npm run build
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
// Next.js development tooling uses eval; the production browser bundle does not.
const scriptSource = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com";

const securityHeaders = [
  // Empêche le clickjacking — SAMEORIGIN permet l'aperçu Shopify Partners Dashboard
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Désactive la détection de type MIME côté navigateur
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Contrôle les informations envoyées dans le Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive les API sensibles non utilisées
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Force HTTPS (1 an, incluant sous-domaines)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy — adapté à Next.js + Stripe + Brevo
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSource,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.stripe.com https://api.brevo.com https://cloud.langfuse.com https://api.mistral.ai",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://cal.eu",
      "frame-ancestors 'self' https://*.shopify.com https://partners.shopify.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Mistral SDK (ESM pur) doit tourner en natif Node.js — pas bundlé par Turbopack
  // Sans cette option : TypeError: fetch failed sur api.mistral.ai depuis Vercel
  serverExternalPackages: ["@mistralai/mistralai"],

  // Skew Protection — associe chaque build à son deploy Vercel
  // VERCEL_DEPLOYMENT_ID est injecté automatiquement par Vercel à chaque deploy
  // En local : undefined → ignoré par Next.js
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,

  // React Compiler — mémoïsation automatique de tous les composants
  // Note : cacheComponents (PPR) retiré — incompatible avec un dashboard 100% authentifié
  // (requireAuth() lit les cookies au niveau page, hors <Suspense> → conflict PPR)
  reactCompiler: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Toutes les routes API — jamais cacheables (données tenant-scoped)
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
