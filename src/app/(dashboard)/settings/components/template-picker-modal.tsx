"use client";

import { useEffect } from "react";
import { COY_SCENARIO_TEMPLATES, CoyTemplate } from "@/config/scenario-templates";

const TONE_LABELS: Record<string, string> = {
  empathique: "Empathique",
  empathique_urgent: "Empathique & urgent",
  direct: "Direct",
  direct_urgent: "Direct & urgent",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: CoyTemplate) => void;
  onSkip: () => void;
  tenantSector: string | null;
}

function compensationSummary(t: CoyTemplate): string {
  if (!t.compensationType) return "";
  if (t.compensationType === "free_shipping") return "Livraison offerte";
  if (t.compensationType === "discount_percent") return `−${t.compensationValue}% (max ${t.compensationMaxEur}€)`;
  if (t.compensationType === "discount_fixed") return `−${t.compensationValue}€ fixe (max ${t.compensationMaxEur}€)`;
  return "";
}

function TemplateCard({
  t,
  tenantSector,
  onSelect,
}: {
  t: CoyTemplate;
  tenantSector: string | null;
  onSelect: (template: CoyTemplate) => void;
}) {
  const isSector = tenantSector ? t.sectors.includes(tenantSector) : false;
  const comp = compensationSummary(t);

  return (
    <button
      type="button"
      onClick={() => onSelect(t)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.25rem",
        padding: "0.75rem 1rem",
        borderRadius: "0.5rem",
        border: isSector
          ? "1.5px solid rgba(217,119,87,0.35)"
          : "1px solid #E5E7EB",
        background: isSector
          ? "rgba(245,240,232,0.6)"
          : "#FAFAFA",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.12s, background 0.12s",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2B2523", flex: 1 }}>
          {t.name}
        </span>
        {isSector && (
          <span
            style={{
              fontSize: "0.68rem",
              padding: "0.125rem 0.4rem",
              borderRadius: "0.25rem",
              background: "rgba(217,119,87,0.12)",
              color: "#D97757",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Votre secteur
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: 0 }}>
        {t.description}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.125rem" }}>
        <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
          Score {t.scoreMin}–{t.scoreMax}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
          {t.channel === null ? "Email ou SMS" : t.channel}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
          {TONE_LABELS[t.tone] ?? t.tone}
        </span>
        {comp && (
          <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
            {comp}
          </span>
        )}
      </div>
    </button>
  );
}

export function TemplatePicker({
  open,
  onClose,
  onSelect,
  onSkip,
  tenantSector,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  // Tri sectoriel interne : secteur tenant → universel → autres secteurs
  function applyGroupSort(templates: CoyTemplate[]): CoyTemplate[] {
    const sector = templates.filter((t) => tenantSector && t.sectors.includes(tenantSector));
    const universal = templates.filter((t) => t.sectors.length === 0);
    const other = templates.filter(
      (t) => t.sectors.length > 0 && !(tenantSector && t.sectors.includes(tenantSector))
    );
    return [...sector, ...universal, ...other];
  }

  // Tri sectoriel : secteur tenant → universel → autres secteurs
  const sortedTemplates = applyGroupSort(COY_SCENARIO_TEMPLATES);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(43,37,35,0.45)",
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(95vw, 600px)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#FFFFFF",
          borderRadius: "0.75rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* En-tête */}
        <div>
          <h2 style={{ fontSize: "0.95rem", color: "#2B2523", margin: 0, fontWeight: 600 }}>
            Choisir un point de départ
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#9CA3AF", margin: "0.25rem 0 0" }}>
            Pré-configuré par CoY — personnalisable entièrement avant de sauvegarder
          </p>
        </div>

        {/* Grille de templates — tri sectoriel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sortedTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              tenantSector={tenantSector}
              onSelect={onSelect}
            />
          ))}
        </div>

        {/* Lien skip */}
        <div style={{ textAlign: "center", paddingBottom: "0.25rem" }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              fontSize: "0.78rem",
              color: "#9CA3AF",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Commencer sans template →
          </button>
        </div>
      </div>
    </>
  );
}
