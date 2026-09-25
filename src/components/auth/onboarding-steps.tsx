"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

const STEPS = [
  { id: 1, label: "Compte créé", status: "done" },
  { id: 2, label: "Connectez vos outils", status: "active" },
  { id: 3, label: "Premier scan IA", status: "pending" },
] as const;

const INTEGRATIONS = [
  {
    name: "Gorgias",
    desc: "Helpdesk & SAV",
    initial: "G",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.18)",
  },
  {
    name: "Shopify",
    desc: "E-commerce",
    initial: "S",
    color: "#3A7A0A",
    bg: "rgba(88,175,60,0.08)",
    border: "rgba(88,175,60,0.2)",
  },
  {
    name: "PrestaShop",
    desc: "E-commerce",
    initial: "P",
    color: "#B5004E",
    bg: "rgba(223,0,103,0.07)",
    border: "rgba(223,0,103,0.18)",
  },
];

type StepStatus = "done" | "active" | "pending";

const STEP_STYLES: Record<StepStatus, { bg: string; border: string; color: string }> = {
  done:    { bg: "#D97757",  border: "transparent",      color: "#FFFFFF" },
  active:  { bg: "#EFF6FF",  border: "#D97757",          color: "#D97757" },
  pending: { bg: "#F3F4F6",  border: "transparent",      color: "#9CA3AF" },
};

const STEP_LABEL_COLOR: Record<StepStatus, string> = {
  done:    "#D97757",
  active:  "#2B2523",
  pending: "#9CA3AF",
};

export function OnboardingSteps() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Confirmation email ─────────────────────────────────────── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: "0.75rem",
          padding: "0.875rem 1.125rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.625rem",
        }}
      >
        <CheckCircle2
          size={18}
          aria-hidden="true"
          style={{ color: "#16A34A", flexShrink: 0, marginTop: 2 }}
        />
        <div>
          <p style={{ fontWeight: 600, color: "#166534", fontSize: "0.875rem", margin: 0 }}>
            Compte créé — vérifiez votre email
          </p>
          <p style={{ color: "#15803D", fontSize: "0.8rem", lineHeight: 1.6, marginTop: "0.2rem", marginBottom: 0 }}>
            Cliquez sur le lien de confirmation pour activer votre compte.
            Vérifiez vos spams si vous ne le recevez pas sous 2 minutes.
          </p>
        </div>
      </div>

      {/* ── Barre de progression 3 étapes ─────────────────────────── */}
      <nav aria-label="Étapes d'onboarding">
        <ol
          style={{
            display: "flex",
            alignItems: "flex-start",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {STEPS.map((step, i) => {
            const s = STEP_STYLES[step.status];
            return (
              <li
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  flex: i < STEPS.length - 1 ? 1 : undefined,
                }}
              >
                {/* Indicateur + label */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <div
                    aria-current={step.status === "active" ? "step" : undefined}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      background: s.bg,
                      border: `2px solid ${s.border}`,
                      color: s.color,
                    }}
                  >
                    {step.status === "done" ? "✓" : step.id}
                  </div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: step.status === "active" ? 600 : 400,
                      color: STEP_LABEL_COLOR[step.status],
                      textAlign: "center",
                      lineHeight: 1.3,
                      maxWidth: 72,
                    }}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connecteur */}
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    style={{
                      flex: 1,
                      height: 2,
                      background: step.status === "done" ? "#D97757" : "#E5E7EB",
                      margin: "0.8rem 0.5rem 0",
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── Titre section ──────────────────────────────────────────── */}
      <div>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#2B2523",
            margin: "0 0 0.25rem 0",
          }}
        >
          Connectez maintenant vos outils.
        </h3>
        <p style={{ fontSize: "0.82rem", color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
          Setup en quelques étapes — sans développeur. CoY commence à surveiller immédiatement.
        </p>
      </div>

      {/* ── Cards intégrations ─────────────────────────────────────── */}
      <ul
        role="list"
        aria-label="Intégrations disponibles"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}
      >
        {INTEGRATIONS.map((integration) => (
          <li key={integration.name}>
            <Link
              href="/integrations"
              aria-label={`Connecter ${integration.name} — ${integration.desc}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                minHeight: 56, /* touch target 44px+ */
                borderRadius: "0.625rem",
                border: `1px solid ${integration.border}`,
                background: "#FFFFFF",
                textDecoration: "none",
                boxShadow: "0 1px 3px rgba(43,37,35,0.06)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Initiale marque */}
                <div
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "0.45rem",
                    background: integration.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    color: integration.color,
                    flexShrink: 0,
                  }}
                >
                  {integration.initial}
                </div>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#2B2523", margin: 0 }}>
                    {integration.name}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: 0 }}>
                    {integration.desc}
                  </p>
                </div>
              </div>
              {/* Bouton Connecter */}
              <span
                aria-hidden="true"
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#D97757",
                  border: "1px solid rgba(217,119,87,0.3)",
                  borderRadius: "0.4rem",
                  padding: "0.3rem 0.75rem",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Connecter
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* ── Note intégrations à venir ──────────────────────────────── */}
      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9CA3AF", margin: 0 }}>
        D&apos;autres intégrations arrivent bientôt : WooCommerce, Crisp, Zendesk, Freshdesk.
      </p>

      {/* ── Lien skip ─────────────────────────────────────────────── */}
      <p style={{ textAlign: "center", margin: 0 }}>
        <Link
          href="/login"
          style={{
            fontSize: "0.82rem",
            color: "#6B7280",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem", /* touch target */
          }}
        >
          Je le ferai plus tard
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </p>

    </div>
  );
}
