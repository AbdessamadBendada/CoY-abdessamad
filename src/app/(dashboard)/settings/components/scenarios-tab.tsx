"use client";

import { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScenarioCard } from "./scenario-card";
import { ScenarioForm } from "./scenario-form";
import { ScenarioPreviewModal } from "./scenario-preview-modal";
import { TemplatePicker } from "./template-picker-modal";
import { SCENARIO_LIMITS } from "@/types/scenarios";
import { CoyTemplate } from "@/config/scenario-templates";
import type { FormState } from "./scenario-form";

// ─── Type exporté (utilisé dans page.tsx et settings-tabs.tsx) ───────────────

export interface ScenarioForClient {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  scoreMin: number;
  scoreMax: number;
  channel: "EMAIL" | "SMS" | null;
  tone: string;
  vouvoiement: boolean;
  autoSendMode: string;
  compensationType: string | null;
  compensationValue: number | null;
  compensationMaxEur: number;
  triggersConfig: { triggers: Array<{ id: string; weight: number; enabled: boolean }> } | null;
  usageCount: number;
  subjectTemplate: string | null;
  contentTemplate: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialScenarios: ScenarioForClient[];
  tenantPlan: string;
  tenantStatus: string;
  tenantSector: string | null;
  dpaSignedAt: string | null;
  customerCounts: Record<string, number>;
  monthlyActionCounts: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScenarioLimit(plan: string): number {
  return SCENARIO_LIMITS[plan.toUpperCase()] ?? 1;
}

// ─── ScenariosTab ─────────────────────────────────────────────────────────────

export function ScenariosTab({
  initialScenarios,
  tenantPlan,
  tenantStatus,
  tenantSector,
  dpaSignedAt,
  customerCounts,
  monthlyActionCounts,
}: Props) {
  const [scenarios, setScenarios] = useState<ScenarioForClient[]>(initialScenarios);
  const [formOpen, setFormOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<ScenarioForClient | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<CoyTemplate | null>(null);
  const [previewScenarioId, setPreviewScenarioId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limit = getScenarioLimit(tenantPlan);
  const limitReached = limit !== -1 && scenarios.length >= limit;

  const planLabel =
    tenantStatus === "TRIAL"
      ? "Essai gratuit"
      : tenantPlan.charAt(0) + tenantPlan.slice(1).toLowerCase();

  function handleCreate() {
    setPendingTemplate(null);
    setEditingScenario(null);
    setPickerOpen(true);
  }

  function handleTemplateSelect(t: CoyTemplate) {
    setPickerOpen(false);
    setPendingTemplate(t); // posé AVANT setFormOpen(true) — initialValues prêt quand open bascule
    setFormOpen(true);
  }

  function handleTemplateSkip() {
    setPickerOpen(false);
    setPendingTemplate(null);
    setFormOpen(true);
  }

  function templateToFormValues(t: CoyTemplate): Partial<FormState> {
    return {
      name: t.name,
      scoreMin: t.scoreMin,
      scoreMax: t.scoreMax,
      channel: t.channel,
      tone: t.tone,
      vouvoiement: t.vouvoiement,
      autoSendMode: "manual", // hard-codé — indépendant du template
      compensationType: t.compensationType,
      compensationValue: t.compensationValue !== null ? String(t.compensationValue) : "",
      compensationMaxEur: String(t.compensationMaxEur),
      subjectTemplate: t.subjectTemplate,
      contentTemplate: t.contentTemplate,
    };
  }

  function handleEdit(s: ScenarioForClient) {
    setEditingScenario(s);
    setFormOpen(true);
  }

  function handlePreview(id: string) {
    setPreviewScenarioId(id);
  }

  async function handleDelete(id: string) {
    const target = scenarios.find((s) => s.id === id);
    if (!target) return;

    const activeCount = scenarios.filter((s) => s.isActive).length;
    if (target.isActive && activeCount <= 1) {
      setError("Impossible de supprimer le dernier scénario actif.");
      return;
    }

    if (!confirm(`Supprimer le scénario "${target.name}" ?`)) return;

    const res = await fetch(`/api/settings/scenarios/${id}`, { method: "DELETE" });
    if (res.ok) {
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de la suppression.");
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    const activeCount = scenarios.filter((s) => s.isActive).length;
    if (current && activeCount <= 1) {
      setError("Vous devez garder au moins un scénario actif.");
      return;
    }

    const target = scenarios.find((sc) => sc.id === id);
    if (!target) return;

    const res = await fetch(`/api/settings/scenarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...target,
        isActive: !current,
        compensationValue: target.compensationValue ?? undefined,
        channel: target.channel ?? undefined,
      }),
    });
    if (res.ok) {
      const { scenario, warnings } = await res.json();
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                isActive: scenario.isActive,
                compensationValue: scenario.compensationValue ?? null,
                compensationMaxEur: Number(scenario.compensationMaxEur),
              }
            : s
        )
      );
      setError(warnings?.length ? `⚠ ${warnings[0]}` : null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de la mise à jour.");
    }
  }

  function handleFormSuccess(saved: ScenarioForClient) {
    setScenarios((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setFormOpen(false);
    setEditingScenario(null);
    setPendingTemplate(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* En-tête + bouton */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            {limit === -1
              ? `Illimité · Plan ${planLabel}`
              : `${scenarios.length}/${limit} scénario${limit > 1 ? "s" : ""} · Plan ${planLabel}`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#B8A898" }}>
            Calcul ROI sur 30 jours (standard WinBack)
          </p>
        </div>
        <Button
          size="sm"
          disabled={limitReached}
          onClick={handleCreate}
          style={{
            background: limitReached ? "#E5E7EB" : "#D97757",
            color: limitReached ? "#9CA3AF" : "#F5F0E8",
            border: "none",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <Plus size={14} />
          Nouveau scénario
        </Button>
      </div>

      {/* Avertissement plan limité */}
      {limitReached && limit !== -1 && (
        <div
          style={{
            background: "rgba(232,184,75,0.08)",
            border: "1px solid rgba(232,184,75,0.35)",
            borderRadius: "0.5rem",
            padding: "0.625rem 0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle size={14} style={{ color: "#C99A30", flexShrink: 0 }} />
          <p style={{ fontSize: "0.75rem", color: "#C99A30" }}>
            Limite atteinte pour votre plan. Passez au plan supérieur pour créer davantage de scénarios.
          </p>
        </div>
      )}

      {/* Avertissement DPA auto-send */}
      {!dpaSignedAt && (
        <div
          style={{
            background: "rgba(232,184,75,0.05)",
            border: "1px solid rgba(232,184,75,0.25)",
            borderRadius: "0.5rem",
            padding: "0.625rem 0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle size={14} style={{ color: "#C99A30", flexShrink: 0 }} />
          <p style={{ fontSize: "0.75rem", color: "#7A6355" }}>
            Signez votre DPA pour activer l&apos;envoi automatique.{" "}
            <a href="/dashboard/dpa" style={{ color: "#D97757", textDecoration: "underline" }}>
              Accéder au DPA
            </a>
          </p>
        </div>
      )}

      {/* Erreur globale */}
      {error && (
        <p style={{ fontSize: "0.78rem", color: "#C0442A" }}>{error}</p>
      )}

      {/* Liste des scénarios */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {scenarios.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            customerCount={customerCounts[s.id] ?? 0}
            monthlyActions={monthlyActionCounts[s.id] ?? 0}
            onEdit={() => handleEdit(s)}
            onDelete={() => handleDelete(s.id)}
            onPreview={() => handlePreview(s.id)}
            onToggleActive={(current) => handleToggleActive(s.id, current)}
          />
        ))}
      </div>

      {/* Formulaire création / édition */}
      <ScenarioForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingScenario(null); setPendingTemplate(null); }}
        onSuccess={handleFormSuccess}
        scenario={editingScenario}
        dpaSignedAt={dpaSignedAt}
        initialValues={pendingTemplate ? templateToFormValues(pendingTemplate) : undefined}
      />

      {/* Picker de templates */}
      <TemplatePicker
        open={pickerOpen}
        onClose={handleTemplateSkip}
        onSelect={handleTemplateSelect}
        onSkip={handleTemplateSkip}
        tenantSector={tenantSector}
      />

      {/* Modal aperçu */}
      {previewScenarioId && (
        <ScenarioPreviewModal
          scenarioId={previewScenarioId}
          scenarioName={scenarios.find((s) => s.id === previewScenarioId)?.name ?? ""}
          onClose={() => setPreviewScenarioId(null)}
        />
      )}
    </div>
  );
}
