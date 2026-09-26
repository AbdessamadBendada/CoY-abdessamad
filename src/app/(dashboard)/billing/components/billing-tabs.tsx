"use client";

import { useState } from "react";
import { CurrentPlanCard } from "./current-plan-card";
import { PlanSelector } from "./plan-selector";
import { InvoicesTable, type InvoiceRow } from "./invoices-table";
import type { ROIGuaranteeResult } from "@/features/billing/services/roi-guarantee";

interface BillingTabsProps {
  plan: string;
  status: string;
  billingCycle: string;
  trialDaysLeft: number | null;
  invoices: InvoiceRow[];
  usage: { customers: number; actions: number; sms: number };
  roiGuarantee: ROIGuaranteeResult;
}

const TABS = [
  { key: "plan", label: "Plan actuel" },
  { key: "change", label: "Changer de plan" },
  { key: "invoices", label: "Factures" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function BillingTabs({
  plan,
  status,
  billingCycle,
  trialDaysLeft,
  invoices,
  usage,
  roiGuarantee,
}: BillingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("plan");

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
        {activeTab === "plan" && (
          <div style={{ maxWidth: 480 }}>
            <CurrentPlanCard
              plan={plan}
              status={status}
              billingCycle={billingCycle}
              trialDaysLeft={trialDaysLeft}
              usage={usage}
              roiGuarantee={roiGuarantee}
            />
          </div>
        )}

        {activeTab === "change" && <PlanSelector status={status} />}

        {activeTab === "invoices" && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#2B2523" }}>
              Historique des factures
            </h3>
            <InvoicesTable invoices={invoices} />
          </div>
        )}
      </div>
    </div>
  );
}
