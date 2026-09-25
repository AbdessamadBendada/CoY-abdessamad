import React from "react";
import Link from "next/link";
import type { OnboardingStatus } from "@/lib/onboarding";

// ─── Types ────────────────────────────────────────────────────────────────────

type BooleanOnboardingKey = "dpaSigné" | "helpdeskConnecté" | "boutiqueConnectée" | "clientsAnalysés";

interface OnboardingChecklistProps {
  status: OnboardingStatus;
}

// ─── Définition des étapes ────────────────────────────────────────────────────

const STEPS = [
  {
    key: "dpaSigné" as const,
    title: "Signer le DPA",
    cta: { label: "Signer", href: "/dpa" },
  },
  {
    key: "helpdeskConnecté" as const,
    title: "Connecter un helpdesk",
    cta: { label: "Connecter", href: "/integrations" },
  },
  {
    key: "boutiqueConnectée" as const,
    title: "Connecter la boutique",
    cta: { label: "Connecter", href: "/integrations" },
  },
  {
    key: "clientsAnalysés" as const,
    title: "Premiers clients analysés",
    cta: { label: "Voir les clients", href: "/customers" },
  },
] satisfies { key: BooleanOnboardingKey; title: string; cta: { label: string; href: string } }[];

// ─── Composant ────────────────────────────────────────────────────────────────

export function OnboardingChecklist({ status }: OnboardingChecklistProps) {
  const completedCount = STEPS.filter((s) => status[s.key]).length;

  return (
    <div
      style={{
        background: "#FAF7F3",
        border: "1px solid #E8DDD0",
        borderRadius: "0.75rem",
        padding: "0.875rem 1rem",
      }}
    >
      {/* Header row: title + progress bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.625rem",
        }}
      >
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3E2A1A" }}>
          {completedCount}/4 étapes complétées
        </p>
        <div
          style={{
            width: 100,
            height: 4,
            background: "#E8DDD0",
            borderRadius: "9999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(completedCount / 4) * 100}%`,
              height: "100%",
              background: "#D97757",
              borderRadius: "9999px",
              transition: "width 400ms ease-out",
            }}
          />
        </div>
      </div>

      {/* Horizontal steps */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          flexWrap: "wrap",
        }}
      >
        {STEPS.map((step, i) => {
          const isDone = status[step.key];
          // Étapes 2 et 3 sont indépendantes — chacune est active si non complétée
          // et que son index correspond à étapeActuelle
          const isActive = !isDone && status.étapeActuelle === i + 1;

          return (
            <React.Fragment key={step.key}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                {/* Circle badge */}
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    background: isDone ? "#D97757" : isActive ? "#C99A30" : "#E8DDD0",
                    color: !isDone && !isActive ? "#B8A898" : "#FFFFFF",
                  }}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                {/* Step title */}
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isDone ? "#9CA3AF" : isActive ? "#3E2A1A" : "#9CA3AF",
                    textDecoration: isDone ? "line-through" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.title}
                </span>
                {/* CTA pill — étape active uniquement */}
                {isActive && (
                  <Link
                    href={step.cta.href}
                    style={{
                      fontSize: "0.68rem",
                      color: "#3E2A1A",
                      fontWeight: 600,
                      background: "#F5F0E8",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "9999px",
                      border: "1px solid rgba(217,119,87,0.3)",
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                    }}
                  >
                    {step.cta.label} →
                  </Link>
                )}
              </div>
              {/* Separator */}
              {i < STEPS.length - 1 && (
                <span style={{ color: "#D1D5DB", fontSize: "0.75rem", flexShrink: 0 }}>
                  ›
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
