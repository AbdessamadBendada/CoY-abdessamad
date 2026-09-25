"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActionChannelBadge } from "./action-status-badge";
import type { ActionRow } from "./actions-table";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  action: ActionRow;
  onClose: () => void;
  onSent: (actionId: string, sentAt: string) => void;
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function ActionReviewModal({ action, onClose, onSent }: Props) {
  const originalSubject = action.subject ?? "";
  const originalContent = stripHtml(action.content);

  const [subject, setSubject] = useState(originalSubject);
  const [content, setContent] = useState(originalContent);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const customerName = action.customer
    ? [action.customer.firstName, action.customer.lastName].filter(Boolean).join(" ") ||
      action.customer.email
    : "—";

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      // Uniquement envoyer les champs modifiés → route déduit wasContentEdited
      if (subject !== originalSubject) body.subject = subject;
      if (content !== originalContent) body.content = content;

      const res = await fetch(`/api/v1/actions/${action.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as { sentAt?: string };
        onSent(action.id, data.sentAt ?? new Date().toISOString());
        onClose();
      } else {
        const err = (await res.json()) as { error?: string };
        if (res.status === 503) {
          setError("Moteur IA temporairement indisponible, réessayez dans quelques minutes.");
        } else {
          setError(err.error ?? "Erreur lors de l'envoi.");
        }
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(43,37,35,0.45)", zIndex: 200 }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(95vw, 560px)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#FFFFFF",
          borderRadius: "0.75rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: "1.5rem",
        }}
      >
        {/* En-tête */}
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "0.95rem", color: "#2B2523", margin: 0, fontWeight: 600 }}>
              Réviser et envoyer
            </h2>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}
            >
              <span style={{ fontSize: "0.8rem", color: "#7A6355" }}>{customerName}</span>
              {action.churnScoreAtCreation != null && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    background: "rgba(192,68,42,0.1)",
                    color: "#C0442A",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "9999px",
                    fontWeight: 600,
                  }}
                >
                  Score {action.churnScoreAtCreation}
                </span>
              )}
              <ActionChannelBadge channel={action.channel} />
            </div>
          </div>
        </div>

        {/* Bandeau ambre */}
        <div
          style={{
            background: "rgba(232,184,75,0.12)",
            border: "1px solid rgba(201,154,48,0.3)",
            borderRadius: "0.5rem",
            padding: "0.625rem 0.75rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ fontSize: "0.78rem", color: "#8A6B00", margin: 0, lineHeight: 1.4 }}>
            Le contenu sera re-validé par CoY avant envoi pour garantir la conformité RGPD/AI Act.
          </p>
        </div>

        {/* Champ Objet (EMAIL uniquement) */}
        {action.channel === "EMAIL" && (
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#2B2523",
                display: "block",
                marginBottom: "0.375rem",
              }}
            >
              Objet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #E5DDD5",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                color: "#2B2523",
                background: "#FAFAF8",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Champ Contenu */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#2B2523",
              display: "block",
              marginBottom: "0.375rem",
            }}
          >
            Contenu
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            maxLength={10000}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              border: "1px solid #E5DDD5",
              borderRadius: "0.5rem",
              fontSize: "0.82rem",
              color: "#2B2523",
              background: "#FAFAF8",
              resize: "vertical",
              lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Erreur */}
        {error && (
          <p style={{ fontSize: "0.78rem", color: "#C0442A", marginBottom: "0.75rem" }}>
            {error}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={sending}
            style={{ fontSize: "0.8rem" }}
          >
            Fermer
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={sending}
            style={{
              background: sending ? "#D1D5DB" : "#D97757",
              color: "#F5F0E8",
              border: "none",
              fontSize: "0.8rem",
            }}
          >
            {sending ? "Envoi en cours…" : "Envoyer maintenant"}
          </Button>
        </div>
      </div>
    </>
  );
}
