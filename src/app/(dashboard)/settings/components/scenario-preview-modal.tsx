"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compensationLabel } from "@/types/scenarios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewResult {
  subject: string;
  content: string;
  channel: string;
  tone: string;
  compensationType: string | null;
  compensationValue: number | null;
  disclaimer: string;
  wasUsingRealCustomer: boolean;
  customerPreview?: { firstName: string; score: number };
  fictionalMessage?: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  scenarioId: string;
  scenarioName: string;
  onClose: () => void;
}

// ─── ScenarioPreviewModal ─────────────────────────────────────────────────────

export function ScenarioPreviewModal({ scenarioId, scenarioName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        const res = await fetch("/api/settings/scenarios/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId }),
        });
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 429) {
            setError("Limite atteinte : 5 aperçus par heure. Réessayez dans quelques minutes.");
          } else {
            setError(body.error ?? "Erreur lors de la génération de l'aperçu.");
          }
        } else {
          setResult(body);
        }
      } catch {
        if (!cancelled) setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreview();
    return () => { cancelled = true; };
  }, [scenarioId]);

  // Fermer sur Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

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
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal
        aria-label={`Aperçu du scénario ${scenarioName}`}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(92vw, 560px)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: "#F5F0E8",
          borderRadius: "0.75rem",
          boxShadow: "0 20px 60px rgba(43,37,35,0.18)",
          overflow: "hidden",
        }}
      >
        {/* En-tête */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.875rem 1.125rem",
            borderBottom: "1px solid rgba(43,37,35,0.1)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Bot size={15} style={{ color: "#D97757" }} />
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#2B2523" }}>
              Aperçu — {scenarioName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9CA3AF",
              padding: "0.25rem",
              lineHeight: 1,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.125rem" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "3px solid #E5E7EB",
                  borderTopColor: "#D97757",
                  margin: "0 auto 0.75rem",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
                Génération de l&apos;aperçu avec CoY…
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                background: "rgba(192,68,42,0.07)",
                border: "1px solid rgba(192,68,42,0.2)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
              }}
            >
              <AlertTriangle size={15} style={{ color: "#C0442A", flexShrink: 0, marginTop: "0.05rem" }} />
              <p style={{ fontSize: "0.8rem", color: "#C0442A" }}>{error}</p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {/* Bandeau contexte client */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: result.wasUsingRealCustomer
                    ? "rgba(92,138,58,0.07)"
                    : "rgba(232,184,75,0.08)",
                  border: `1px solid ${result.wasUsingRealCustomer ? "rgba(92,138,58,0.2)" : "rgba(232,184,75,0.3)"}`,
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                }}
              >
                <User size={13} style={{ color: result.wasUsingRealCustomer ? "#5C8A3A" : "#C99A30", flexShrink: 0 }} />
                <p style={{ fontSize: "0.75rem", color: result.wasUsingRealCustomer ? "#5C8A3A" : "#C99A30" }}>
                  {result.wasUsingRealCustomer && result.customerPreview
                    ? `Aperçu généré pour ${result.customerPreview.firstName}, client à risque (score ${result.customerPreview.score})`
                    : result.fictionalMessage ?? "Aperçu basé sur un exemple fictif — aucun client dans cette plage actuellement"}
                </p>
              </div>

              {/* Sujet (email uniquement) */}
              {result.channel === "EMAIL" && result.subject && (
                <div>
                  <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Objet
                  </p>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2B2523" }}>
                    {result.subject}
                  </p>
                </div>
              )}

              {/* Contenu du message */}
              <div>
                <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {result.channel === "SMS" ? "Message SMS" : "Corps de l'email"}
                </p>
                {result.channel === "EMAIL" ? (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "0.5rem",
                      border: "1px solid #E5E7EB",
                      padding: "0.875rem 1rem",
                      fontSize: "0.82rem",
                      color: "#2B2523",
                      lineHeight: 1.6,
                    }}
                    // EMAIL uniquement — sanitisé côté serveur via sanitizeEmailHtml.
                    // Le SMS n'est jamais sanitisé en HTML (non concerné) — il est
                    // donc toujours rendu en texte brut, jamais via dangerouslySetInnerHTML.
                    dangerouslySetInnerHTML={{ __html: result.content }}
                  />
                ) : (
                  <p
                    style={{
                      background: "#fff",
                      borderRadius: "0.5rem",
                      border: "1px solid #E5E7EB",
                      padding: "0.875rem 1rem",
                      fontSize: "0.82rem",
                      color: "#2B2523",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {result.content}
                  </p>
                )}
              </div>

              {/* Tags métadonnées */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", background: "rgba(43,37,35,0.06)", color: "#6B7280" }}>
                  Ton : {result.tone}
                </span>
                {result.compensationType && (
                  <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", background: "rgba(217,119,87,0.1)", color: "#D97757" }}>
                    {compensationLabel(result.compensationType, result.compensationValue)}
                  </span>
                )}
                <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", background: "rgba(43,37,35,0.04)", color: "#9CA3AF" }}>
                  {result.channel}
                </span>
              </div>

              {/* Disclaimer IA */}
              {result.disclaimer && (
                <p style={{ fontSize: "0.7rem", color: "#B8A898", fontStyle: "italic" }}>
                  {result.disclaimer}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pied */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "0.75rem 1.125rem",
            borderTop: "1px solid rgba(43,37,35,0.08)",
            flexShrink: 0,
          }}
        >
          <Button
            size="sm"
            onClick={onClose}
            style={{
              background: "#2B2523",
              color: "#F5F0E8",
              border: "none",
              fontSize: "0.8rem",
            }}
          >
            Fermer
          </Button>
        </div>
      </div>
    </>
  );
}
