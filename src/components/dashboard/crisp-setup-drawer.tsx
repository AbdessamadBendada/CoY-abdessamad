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

// ─── Composant principal ──────────────────────────────────────────────────────

export function CrispSetupDrawer() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps: Step[] = [
    {
      title: "Étape 1 — Ouvrir les Paramètres Crisp",
      image: {
        src: "/images/crisp-setup/c1-parametres.png",
        alt: "Crisp — cliquer sur Paramètres",
        caption: "→ Cliquez sur « Paramètres » en bas du menu gauche (encadré rouge)",
      },
      content: (
        <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
          Connectez-vous à votre compte Crisp sur{" "}
          <strong>app.crisp.chat</strong>. Dans le menu de gauche, cliquez
          sur <strong>Paramètres</strong> (icône engrenage, tout en bas).
        </p>
      ),
    },
    {
      title: "Étape 2 — Accéder à l'Espace de travail",
      image: {
        src: "/images/crisp-setup/c2-espace-travail.png",
        alt: "Paramètres Crisp — cliquer sur Espace de travail",
        caption: "→ Cliquez sur « Espace de travail » pour déplier le sous-menu (encadré rouge)",
      },
      content: (
        <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
          Dans la page Paramètres, cliquez sur{" "}
          <strong>Espace de travail</strong> dans le menu de gauche pour
          déplier les options de configuration de votre espace.
        </p>
      ),
    },
    {
      title: "Étape 3 — Copier l'identifiant du site",
      image: {
        src: "/images/crisp-setup/c3-id-site.png",
        alt: "Mise en place et intégrations — ID du site à copier",
        caption: "→ Cliquez sur « Mise en place et intégrations » puis copiez l'ID du site (encadré rouge)",
      },
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
            Dans le sous-menu Espace de travail, cliquez sur{" "}
            <strong>Mise en place et intégrations</strong>. Vous verrez
            votre <strong>ID du site</strong> en haut de la page — cliquez
            sur <strong>Copier</strong>.
          </p>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", lineHeight: 1.5 }}>
            Chemin : <strong>Paramètres → Espace de travail → Mise en place et intégrations</strong>
          </p>
        </div>
      ),
    },
    {
      title: "Étape 4 — Coller l'ID dans CoY",
      image: {
        src: "/images/crisp-setup/c4-winback-form.png",
        alt: "Dashboard CoY — formulaire Crisp avec champ Website ID",
        caption: "→ Collez votre ID dans le champ Website ID puis cliquez sur « Tester & Activer » (encadré rouge)",
      },
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
            Revenez dans CoY → <strong>Intégrations</strong>.
            Sur la carte Crisp, collez votre ID dans le champ{" "}
            <strong>Website ID</strong>, puis cliquez sur{" "}
            <strong>Tester &amp; Activer</strong>.
          </p>
          <div
            style={{
              background: "rgba(217,119,87,0.06)",
              border: "1px solid rgba(217,119,87,0.15)",
              borderRadius: "0.5rem",
              padding: "0.65rem 0.875rem",
              fontSize: "0.78rem",
              color: "#1d4ed8",
              lineHeight: 1.5,
            }}
          >
            CoY vérifie la connexion automatiquement. L&apos;opération
            prend quelques secondes.
          </div>
        </div>
      ),
    },
    {
      title: "Étape 5 — Configuration terminée !",
      image: {
        src: "/images/crisp-setup/c5-succes.png",
        alt: "Dashboard CoY — badge Connecté Crisp",
        caption: "→ Le badge « Connecté » confirme que l'intégration est active",
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
              CoY est maintenant connecté à Crisp
            </p>
            <p style={{ fontSize: "0.8rem", color: "#059669", marginTop: "0.25rem" }}>
              Vos conversations seront analysées automatiquement.
            </p>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#374151", lineHeight: 1.6 }}>
            <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Pour vérifier :</p>
            <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <li>Patientez jusqu&apos;à 30 minutes (première synchronisation)</li>
              <li>
                Vos clients Crisp apparaîtront dans CoY →{" "}
                <strong>Clients à risque</strong> avec leur score
              </li>
              <li>
                Les conversations avec messages clients déclencheront un
                score de churn automatique
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
        Guide de configuration →
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
              <span style={{ fontSize: "1.25rem" }}>💬</span>
              <div>
                <SheetTitle style={{ fontSize: "1rem", color: "#2B2523" }}>
                  Configurer Crisp
                </SheetTitle>
                <SheetDescription style={{ fontSize: "0.75rem" }}>
                  Guide de configuration — 5 étapes
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
