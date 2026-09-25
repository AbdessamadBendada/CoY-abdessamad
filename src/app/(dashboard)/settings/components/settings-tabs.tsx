"use client";

import { useState } from "react";
import { CompanyForm } from "./company-form";
import { WinbackSettingsForm } from "./winback-settings-form";
import { ScenariosTab } from "./scenarios-tab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ScenarioForClient } from "./scenarios-tab";

interface SettingsTabsProps {
  name: string;
  email: string;
  phone: string;
  website: string;
  siret: string;
  churnThreshold: number;
  cooldownDays: number;
  scenarios: ScenarioForClient[];
  tenantPlan: string;
  tenantStatus: string;
  tenantSector: string | null;
  dpaSignedAt: string | null;
  customerCounts: Record<string, number>;
  monthlyActionCounts: Record<string, number>;
}

const TABS = [
  { key: "company", label: "Votre entreprise" },
  { key: "detection", label: "Détection" },
  { key: "scenarios", label: "Scénarios" },
  { key: "account", label: "Compte" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SettingsTabs({
  name,
  email,
  phone,
  website,
  siret,
  churnThreshold,
  cooldownDays,
  scenarios,
  tenantPlan,
  tenantStatus,
  tenantSector,
  dpaSignedAt,
  customerCounts,
  monthlyActionCounts,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("company");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid #E5E7EB",
          marginBottom: "1rem",
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.8rem",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#2B2523" : "#6B7280",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #D97757" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: "-1px",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {activeTab === "company" && (
          <div style={{ maxWidth: 560 }}>
            <p className="text-xs text-muted-foreground mb-3">
              Ces informations apparaissent sur vos factures Factur-X.
            </p>
            <CompanyForm
              name={name}
              email={email}
              phone={phone}
              website={website}
              siret={siret}
            />
          </div>
        )}

        {activeTab === "detection" && (
          <div style={{ maxWidth: 480 }}>
            <p className="text-xs text-muted-foreground mb-3">
              Contrôlez la sensibilité de CoY et la fréquence de contact.
            </p>
            <WinbackSettingsForm
              churnThreshold={churnThreshold}
              cooldownDays={cooldownDays}
            />
          </div>
        )}

        {activeTab === "scenarios" && (
          <div style={{ maxWidth: 640 }}>
            <ScenariosTab
              initialScenarios={scenarios}
              tenantPlan={tenantPlan}
              tenantStatus={tenantStatus}
              tenantSector={tenantSector}
              dpaSignedAt={dpaSignedAt}
              customerCounts={customerCounts}
              monthlyActionCounts={monthlyActionCounts}
            />
          </div>
        )}

        {activeTab === "account" && (
          <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Card>
              <CardContent className="py-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Adresse e-mail du compte
                  </p>
                  <p className="text-sm font-mono">{email}</p>
                </div>
                <div className="border-t pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mot de passe</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Un lien de réinitialisation vous sera envoyé par e-mail.
                    </p>
                  </div>
                  <Link href="/forgot-password">
                    <Button variant="outline" size="sm">
                      Changer le mot de passe
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Zone de danger */}
            <div
              style={{
                background: "rgba(192,68,42,0.04)",
                border: "1px solid rgba(192,68,42,0.2)",
                borderRadius: "0.625rem",
                padding: "1rem 1.25rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#C0442A",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                Zone sensible
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#2B2523" }}>
                    Résilier l&apos;abonnement
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "#B8A898", marginTop: "0.125rem" }}>
                    Toutes vos données seront conservées 30 jours.
                  </p>
                </div>
                <Link href="/billing">
                  <Button
                    variant="outline"
                    size="sm"
                    style={{
                      border: "1px solid rgba(192,68,42,0.35)",
                      color: "#C0442A",
                      background: "transparent",
                      flexShrink: 0,
                    }}
                  >
                    Gérer l&apos;abonnement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
