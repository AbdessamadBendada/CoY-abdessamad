export const dynamic = "force-dynamic";


import { requireAuth } from "@/features/auth/server";
import { Mail, MessageCircle, BookOpen, ExternalLink } from "lucide-react";

export default async function SupportPage() {
  await requireAuth();

  return (
    <div className="app-page max-w-5xl">
      {/* En-tête */}
      <div className="app-page-header"><div>
        <p className="app-page-kicker">Aide humaine</p>
        <h2>
          Support
        </h2>
        <p className="app-page-description">
          Notre équipe est disponible pour vous aider. Réponse garantie sous 24h.
        </p>
      </div></div>

      {/* Cartes de contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Email */}
        <a
          href="mailto:support@coyia.fr"
          className="support-card"
          style={{
            display: "block",
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "1.5rem",
            textDecoration: "none",
            transition: "box-shadow 0.2s, border-color 0.2s",
            boxShadow: "0 4px 24px rgba(43,37,35,0.04)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <Mail style={{ width: 24, height: 24, color: "#E8B84B" }} />
          </div>
          <p style={{ fontWeight: 700, color: "#2B2523", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
            Email support
          </p>
          <p style={{ color: "#6B7280", fontSize: "0.82rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            Écrivez-nous pour toute question technique, commerciale ou RGPD.
          </p>
          <span style={{ color: "#D97757", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
            support@coyia.fr <ExternalLink style={{ width: 12, height: 12 }} />
          </span>
        </a>

        {/* Chat / Contact */}
        <a
          href="mailto:contact@coyia.fr"
          className="support-card"
          style={{
            display: "block",
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "1.5rem",
            textDecoration: "none",
            transition: "box-shadow 0.2s, border-color 0.2s",
            boxShadow: "0 4px 24px rgba(43,37,35,0.04)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <MessageCircle style={{ width: 24, height: 24, color: "#E8B84B" }} />
          </div>
          <p style={{ fontWeight: 700, color: "#2B2523", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
            Contact commercial
          </p>
          <p style={{ color: "#6B7280", fontSize: "0.82rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            Questions sur votre abonnement, changement de plan, devis sur mesure.
          </p>
          <span style={{ color: "#D97757", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
            contact@coyia.fr <ExternalLink style={{ width: 12, height: 12 }} />
          </span>
        </a>
      </div>

      {/* Documentation */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 4px 24px rgba(43,37,35,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <BookOpen style={{ width: 24, height: 24, color: "#E8B84B", flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, color: "#2B2523", fontSize: "0.95rem" }}>
              Ressources & FAQ
            </p>
            <p style={{ color: "#6B7280", fontSize: "0.82rem" }}>
              Retrouvez les réponses aux questions les plus courantes.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {[
            { q: "Comment connecter Gorgias / Shopify / PrestaShop ?", a: "Rendez-vous dans la section Intégrations de votre dashboard. Suivez le guide étape par étape pour votre plateforme — comptez 10 à 20 minutes, aucun développeur requis." },
            { q: "Comment interpréter le score churn ?", a: "Le score churn va de 0 (client stable) à 100 (risque élevé). Un score ≥ 70 déclenche automatiquement une action de récupération." },
            { q: "Comment personnaliser les scénarios de récupération ?", a: "Dans l'onglet Paramètres, section Scénarios, vous pouvez ajuster le ton, les compensations proposées et les délais d'envoi selon votre secteur." },
          ].map(({ q, a }) => (
            <details
              key={q}
              style={{
                borderRadius: "0.5rem",
                border: "1px solid #E8DDD0",
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  padding: "0.6rem 0.875rem",
                  background: "#F8F7F4",
                  color: "#374151",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  userSelect: "none",
                }}
              >
                <span>{q}</span>
                <span className="faq-chevron" style={{ color: "#B8A898", fontSize: "0.75rem", flexShrink: 0, display: "inline-block", transition: "transform 200ms ease" }}>▾</span>
              </summary>
              <div
                style={{
                  padding: "0.6rem 0.875rem 0.75rem",
                  background: "#FFFFFF",
                  borderTop: "1px solid #E8DDD0",
                  color: "#6B7280",
                  fontSize: "0.82rem",
                  lineHeight: 1.55,
                }}
              >
                {a}
              </div>
            </details>
          ))}
        </div>
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "0.875rem",
            borderTop: "1px solid #E8DDD0",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
          }}
        >
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>🇫🇷</span>
          <p style={{ color: "#2B2523", fontSize: "0.8rem", lineHeight: 1.4 }}>
            <strong>Support 100% français</strong> — Réponse garantie sous 24h (jours ouvrés).
            En attendant, écrivez-nous à{" "}
            <a href="mailto:support@coyia.fr" style={{ color: "#D97757", textDecoration: "none" }}>
              support@coyia.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
