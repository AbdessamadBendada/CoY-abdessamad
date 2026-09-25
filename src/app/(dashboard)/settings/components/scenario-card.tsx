"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Eye, Users, Zap } from "lucide-react";
import { compensationLabel } from "@/types/scenarios";
import type { ScenarioForClient } from "./scenarios-tab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreRangeLabel(min: number, max: number): string {
  if (max <= 70) return "Risque faible";
  if (min >= 81) return "Risque élevé";
  return "Risque modéré";
}

function scoreBadgeColors(min: number, max: number) {
  if (max <= 70) return { bg: "rgba(92,138,58,0.1)", color: "#5C8A3A", border: "rgba(92,138,58,0.25)" };
  if (min >= 81) return { bg: "rgba(192,68,42,0.08)", color: "#C0442A", border: "rgba(192,68,42,0.2)" };
  return { bg: "rgba(232,184,75,0.1)", color: "#C99A30", border: "rgba(232,184,75,0.3)" };
}

function toneLabel(tone: string): string {
  const map: Record<string, string> = {
    empathique: "Empathique",
    empathique_urgent: "Empathique & urgent",
    direct: "Direct",
    direct_urgent: "Direct & urgent",
  };
  return map[tone] ?? tone;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  scenario: ScenarioForClient;
  customerCount: number;
  monthlyActions: number;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onToggleActive: (current: boolean) => void;
}

// ─── ScenarioCard ─────────────────────────────────────────────────────────────

export function ScenarioCard({
  scenario,
  customerCount,
  monthlyActions,
  onEdit,
  onDelete,
  onPreview,
  onToggleActive,
}: Props) {
  const [toggling, setToggling] = useState(false);
  const badgeColors = scoreBadgeColors(scenario.scoreMin, scenario.scoreMax);

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggleActive(scenario.isActive);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card
      style={{
        border: scenario.isActive ? "1px solid rgba(217,119,87,0.25)" : "1px solid #E5E7EB",
        borderRadius: "0.625rem",
        transition: "border-color 0.15s",
        opacity: scenario.isActive ? 1 : 0.65,
      }}
    >
      <CardContent style={{ padding: "0.875rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          {/* Toggle actif */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={scenario.isActive ? "Désactiver" : "Activer"}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              background: scenario.isActive ? "#D97757" : "#D1D5DB",
              border: "none",
              cursor: toggling ? "wait" : "pointer",
              flexShrink: 0,
              marginTop: "0.125rem",
              position: "relative",
              transition: "background 0.2s",
            }}
            aria-label={scenario.isActive ? "Désactiver le scénario" : "Activer le scénario"}
          >
            <span
              style={{
                display: "block",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 3,
                left: scenario.isActive ? 19 : 3,
                transition: "left 0.2s",
              }}
            />
          </button>

          {/* Contenu principal */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Ligne 1 : nom + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2B2523" }}>
                {scenario.name}
              </span>

              {/* Score range badge */}
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  padding: "0.1rem 0.5rem",
                  borderRadius: "0.25rem",
                  background: badgeColors.bg,
                  color: badgeColors.color,
                  border: `1px solid ${badgeColors.border}`,
                }}
              >
                {scoreRangeLabel(scenario.scoreMin, scenario.scoreMax)} · {scenario.scoreMin}–{scenario.scoreMax}
              </span>

              {/* Canal */}
              {scenario.channel && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "0.25rem",
                    background: "rgba(43,37,35,0.06)",
                    color: "#6B7280",
                  }}
                >
                  {scenario.channel}
                </span>
              )}

              {/* Message — badge si rempli, micro-CTA si vide */}
              {(scenario.subjectTemplate || scenario.contentTemplate) ? (
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "0.25rem",
                    background: "rgba(92,138,58,0.08)",
                    color: "#5C8A3A",
                    border: "1px solid rgba(92,138,58,0.2)",
                  }}
                >
                  Message ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onEdit}
                  style={{
                    fontSize: "0.68rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "0.25rem",
                    background: "transparent",
                    color: "#D97757",
                    border: "1px dashed rgba(217,119,87,0.4)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Personnaliser le message
                </button>
              )}

              {/* Mode envoi */}
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "0.25rem",
                  background:
                    scenario.autoSendMode === "auto"
                      ? "rgba(92,138,58,0.08)"
                      : "rgba(43,37,35,0.05)",
                  color: scenario.autoSendMode === "auto" ? "#5C8A3A" : "#9CA3AF",
                }}
              >
                {scenario.autoSendMode === "auto" ? "Auto" : "Manuel"}
              </span>
            </div>

            {/* Ligne 2 : ton + compensation */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginTop: "0.25rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                {toneLabel(scenario.tone)} · {scenario.vouvoiement ? "Vouvoiement" : "Tutoiement"}
              </span>

              {scenario.compensationType && (
                <span style={{ fontSize: "0.75rem", color: "#D97757", fontWeight: 500 }}>
                  {compensationLabel(scenario.compensationType, scenario.compensationValue)}
                </span>
              )}
            </div>

            {/* Ligne 3 : métriques */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginTop: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Users size={12} style={{ color: "#B8A898" }} />
                <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
                  ~{customerCount} client{customerCount !== 1 ? "s" : ""} concerné{customerCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Zap size={12} style={{ color: "#B8A898" }} />
                <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
                  {monthlyActions} déclenchement{monthlyActions !== 1 ? "s" : ""} ce mois
                </span>
              </div>
              {scenario.usageCount > 0 && (
                <span style={{ fontSize: "0.72rem", color: "#B8A898" }}>
                  {scenario.usageCount} total
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={onPreview}
              title="Aperçu du message"
              style={{ padding: "0.375rem", height: "auto", color: "#6B7280" }}
            >
              <Eye size={15} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              title="Modifier"
              style={{ padding: "0.375rem", height: "auto", color: "#6B7280" }}
            >
              <Edit2 size={15} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              title="Supprimer"
              style={{ padding: "0.375rem", height: "auto", color: "#C0442A" }}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        {/* Manuel info banner */}
        {scenario.autoSendMode === "manual" && scenario.isActive && (
          <div
            style={{
              marginTop: "0.625rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid #F3F4F6",
              fontSize: "0.72rem",
              color: "#9CA3AF",
            }}
          >
            Vous validez chaque envoi — aucun message ne part sans votre accord ✓
          </div>
        )}
      </CardContent>
    </Card>
  );
}
