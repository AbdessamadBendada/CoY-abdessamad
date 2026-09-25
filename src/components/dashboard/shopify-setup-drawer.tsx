"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = {
  title: string;
  image: { src: string; alt: string; caption: string };
  content: React.ReactNode;
};

// ─── Screenshot avec fade-in ──────────────────────────────────────────────────

function StepScreenshot({
  src,
  alt,
  caption,
  animKey,
}: {
  src: string;
  alt: string;
  caption: string;
  animKey: number;
}) {
  return (
    <div
      key={animKey}
      style={{
        borderRadius: "0.625rem",
        overflow: "hidden",
        border: "1px solid rgba(43,37,35,0.1)",
        boxShadow: "0 2px 12px rgba(43,37,35,0.07)",
        animation: "fadeSlideIn 0.3s ease forwards",
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={960}
        height={540}
        style={{ width: "100%", height: "auto", display: "block" }}
        priority
      />
      <div
        style={{
          background: "rgba(217,119,87,0.06)",
          borderTop: "1px solid rgba(217,119,87,0.12)",
          padding: "0.45rem 0.75rem",
          fontSize: "0.72rem",
          color: "#D97757",
          fontWeight: 500,
        }}
      >
        {caption}
      </div>
    </div>
  );
}

// ─── URL copiable ─────────────────────────────────────────────────────────────

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        background: "rgba(43,37,35,0.05)",
        border: "1px solid rgba(43,37,35,0.12)",
        borderRadius: "0.5rem",
        padding: "0.65rem 0.875rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}
    >
      <code style={{ fontSize: "0.7rem", color: "#2B2523", wordBreak: "break-all", flex: 1 }}>
        {url}
      </code>
      <button
        onClick={handleCopy}
        style={{
          background: copied ? "rgba(232,184,75,0.15)" : "rgba(217,119,87,0.1)",
          color: copied ? "#C99A30" : "#D97757",
          border: "none",
          borderRadius: "0.375rem",
          padding: "0.25rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}
      >
        {copied ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}

// ─── Bloc webhook ─────────────────────────────────────────────────────────────

const WEBHOOK_ROLE: Record<number, string> = {
  1: "Détecte chaque nouvelle commande — alimente la fréquence d'achat, le panier moyen et la date de dernière commande.",
  2: "Détecte les annulations et remboursements — signaux churn critiques pour le scoring.",
  3: "Met à jour le profil client (prénom, téléphone) pour personnaliser les emails de récupération.",
};

function WebhookBlock({ num, event, url }: { num: number; event: string; url: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(32,178,170,0.2)",
        borderRadius: "0.5rem",
        padding: "0.75rem",
        background: "rgba(32,178,170,0.03)",
      }}
    >
      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2B2523", marginBottom: "0.25rem" }}>
        Webhook {num} — {event}
      </p>
      <p style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: "0.4rem", lineHeight: 1.5 }}>
        {WEBHOOK_ROLE[num]}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.4rem" }}>
        <Row label="Événement" value={event} />
        <Row label="Format" value="JSON" />
        <Row label="Version API" value="2026-01 (Dernière version)" />
      </div>
      <p style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: "0.3rem" }}>URL :</p>
      <CopyableUrl url={url} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.76rem" }}>
      <span style={{ color: "#6B7280", minWidth: "6.5rem" }}>{label} :</span>
      <span style={{ color: "#2B2523", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ShopifySetupDrawer({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const webhookUrl = `https://winback-agent.fr/api/webhooks/shopify?tenantId=${tenantId}`;

  const steps: Step[] = [
    {
      title: "Étape 1 — Ouvrir les Paramètres",
      image: {
        src: "/images/shopify-setup/s1-parametres.png",
        alt: "Admin Shopify — cliquer sur Paramètres",
        caption: "→ Cliquez sur « Paramètres » en bas à gauche (encadré jaune)",
      },
      content: (
        <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
          Connectez-vous à votre admin Shopify. Dans le menu de gauche, cliquez
          sur <strong>Paramètres</strong> (icône engrenage, tout en bas).
        </p>
      ),
    },
    {
      title: "Étape 2 — Aller dans Notifications",
      image: {
        src: "/images/shopify-setup/s2-notifications.png",
        alt: "Paramètres Shopify — cliquer sur Notifications",
        caption: "→ Cliquez sur « Notifications » dans le menu gauche (encadré jaune)",
      },
      content: (
        <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
          Dans la page Paramètres, cliquez sur <strong>Notifications</strong>{" "}
          dans la liste à gauche.
        </p>
      ),
    },
    {
      title: "Étape 3 — Ouvrir la section Webhooks",
      image: {
        src: "/images/shopify-setup/s3-webhooks.png",
        alt: "Notifications — cliquer sur Webhooks",
        caption: "→ Cliquez sur « Webhooks » en bas de la page (encadré jaune)",
      },
      content: (
        <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
          Sur la page <strong>Notifications</strong>, faites défiler vers le bas
          et cliquez sur <strong>Webhooks</strong>.
        </p>
      ),
    },
    {
      title: "Étape 4 — Créer un webhook",
      image: {
        src: "/images/shopify-setup/s4-creer.png",
        alt: "Page Webhooks — cliquer sur Créer un webhook",
        caption: "→ Cliquez sur « ⊕ Créer un webhook » (encadré jaune)",
      },
      content: (
        <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
          Sur la page <strong>Webhooks</strong>, cliquez sur{" "}
          <strong>⊕ Créer un webhook</strong>. Vous répéterez cette action{" "}
          <strong>3 fois</strong> — une par webhook ci-dessous.
        </p>
      ),
    },
    {
      title: "Étape 5 — Remplir et enregistrer × 3",
      image: {
        src: "/images/shopify-setup/s5-formulaire.png",
        alt: "Formulaire webhook rempli — cliquer sur Enregistrer",
        caption: "→ Remplissez les champs puis cliquez sur « Enregistrer » (encadré jaune)",
      },
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
            Créez les 3 webhooks un par un. Pour chacun :{" "}
            <strong>sélectionnez l&apos;événement</strong>, laissez le format en{" "}
            <strong>JSON</strong>, choisissez la version{" "}
            <strong>2026-01</strong>, collez l&apos;URL et cliquez{" "}
            <strong>Enregistrer</strong>.
          </p>
          <WebhookBlock num={1} event="Création d'une commande" url={webhookUrl} />
          <WebhookBlock num={2} event="Mise à jour d'une commande" url={webhookUrl} />
          <WebhookBlock num={3} event="Mise à jour d'un client" url={webhookUrl} />
        </div>
      ),
    },
    {
      title: "Étape 6 — Configuration terminée !",
      image: {
        src: "/images/shopify-setup/s6-succes.png",
        alt: "Toast Webhook enregistré avec succès",
        caption: "→ Ce message confirme chaque webhook enregistré (encadré jaune)",
      },
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "0.75rem",
              padding: "0.875rem 1.25rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>✅</p>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#065f46" }}>
              CoY est maintenant connecté
            </p>
            <p style={{ fontSize: "0.8rem", color: "#059669", marginTop: "0.25rem" }}>
              Vos commandes seront analysées automatiquement.
            </p>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#374151", lineHeight: 1.6 }}>
            <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Pour vérifier :</p>
            <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <li>Créez une commande test dans votre admin Shopify</li>
              <li>Patientez 2–3 minutes</li>
              <li>
                Ce client apparaîtra dans CoY →{" "}
                <strong>Clients</strong> avec son premier score
              </li>
            </ol>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#6B7280" }}>
            Un problème ? <strong>contact@coyia.fr</strong>
          </p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Button
        variant="outline"
        size="sm"
        onClick={() => { setStep(0); setOpen(true); }}
        style={{ borderColor: "rgba(217,119,87,0.4)", color: "#D97757" }}
      >
        Configurer les webhooks →
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          style={{
            width: "100%",
            maxWidth: "540px",
            display: "flex",
            flexDirection: "column",
            padding: "1.25rem",
          }}
        >
          {/* Header */}
          <SheetHeader style={{ paddingBottom: "1rem", borderBottom: "1px solid rgba(43,37,35,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🛍️</span>
              <div>
                <SheetTitle style={{ fontSize: "1rem", color: "#2B2523" }}>
                  Configurer Shopify
                </SheetTitle>
                <SheetDescription style={{ fontSize: "0.75rem" }}>
                  Guide de configuration des webhooks — 6 étapes
                </SheetDescription>
              </div>
            </div>
            {/* Stepper */}
            <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.75rem" }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "3px",
                    borderRadius: "2px",
                    background: i <= step ? "#D97757" : "rgba(43,37,35,0.1)",
                    transition: "background 0.25s",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: "0.25rem" }}>
              Étape {step + 1} sur {steps.length}
            </p>
          </SheetHeader>

          {/* Contenu scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 0" }} key={step}>
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#2B2523",
                marginBottom: "0.875rem",
                animation: "fadeSlideIn 0.25s ease forwards",
              }}
            >
              {currentStep.title}
            </h3>

            <StepScreenshot
              src={currentStep.image.src}
              alt={currentStep.image.alt}
              caption={currentStep.image.caption}
              animKey={step}
            />

            <div style={{ marginTop: "1rem", animation: "fadeSlideIn 0.3s ease 0.05s both" }}>
              {currentStep.content}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: "0.75rem", paddingTop: "1rem", borderTop: "1px solid rgba(43,37,35,0.08)" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={isFirst}
              style={{ flex: 1 }}
            >
              ← Précédent
            </Button>
            {isLast ? (
              <Button
                size="sm"
                onClick={() => setOpen(false)}
                style={{ flex: 1, background: "#D97757" }}
              >
                Terminer ✓
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                style={{ flex: 1, background: "#D97757" }}
              >
                Suivant →
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
