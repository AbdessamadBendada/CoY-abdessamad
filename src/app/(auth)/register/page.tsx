"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { register } from "../actions";
import { OnboardingSteps } from "@/components/auth/onboarding-steps";

const RADAR_LOGO = (
  <svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
    <circle cx="36" cy="36" r="8"  fill="none" stroke="#E8B84B" strokeWidth="1.5"/>
    <circle cx="36" cy="36" r="16" fill="none" stroke="#D97757" strokeWidth="1"/>
    <circle cx="36" cy="36" r="24" fill="none" stroke="#E8B84B" strokeWidth="0.8" opacity="0.7"/>
    <circle cx="36" cy="36" r="32" fill="none" stroke="#D97757" strokeWidth="0.6" opacity="0.5"/>
    <line x1="36" y1="4"  x2="36" y2="68" stroke="#E8B84B" strokeWidth="0.5" opacity="0.35"/>
    <line x1="4"  y1="36" x2="68" y2="36" stroke="#E8B84B" strokeWidth="0.5" opacity="0.35"/>
    <path d="M36 36 L36 4 A32 32 0 0 1 68 36 Z" fill="rgba(217,119,87,0.15)"/>
    <circle cx="36" cy="36" r="3" fill="#D97757"/>
  </svg>
);

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await register(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.message);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <OnboardingSteps />;
  }

  return (
    <div style={{ width: "100%" }}>

      {/* ─── Logo CoYia ─────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ display: "inline-block", marginBottom: "0.75rem" }}>{RADAR_LOGO}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.15rem" }}>
          <span style={{ fontWeight: 800, color: "#F5F0E8", fontSize: "1.4rem" }}>CoY</span>
          <span style={{ fontWeight: 600, color: "#E8B84B", fontSize: "1.4rem" }}>ia</span>
        </div>
      </div>

      {/* ─── Titre ──────────────────────────────────────────────── */}
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 400,
          fontSize: "clamp(1.75rem, 4vw, 2rem)",
          color: "#F5F0E8",
          marginBottom: "0.5rem",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        Commencer l&apos;essai gratuit.
      </h1>
      <p style={{ color: "#B8A898", fontSize: "0.88rem", textAlign: "center", marginBottom: "2rem" }}>
        Premier client à risque identifié en &lt;&nbsp;24h.
      </p>

      {/* ─── Erreur ─────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: "rgba(192, 68, 42, 0.15)",
            border: "1px solid rgba(192, 68, 42, 0.3)",
            borderRadius: "0.625rem",
            padding: "0.75rem 1rem",
            color: "#F08070",
            fontSize: "0.85rem",
            marginBottom: "1.25rem",
          }}
        >
          {error}
        </div>
      )}

      {/* ─── Formulaire ─────────────────────────────────────────── */}
      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Label htmlFor="companyName" style={{ color: "#E8DDD0", fontSize: "0.85rem" }}>
            Nom de votre boutique <span style={{ color: "#D97757" }}>*</span>
          </Label>
          <Input
            id="companyName"
            name="companyName"
            placeholder="Ma Boutique"
            required
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#F5F0E8",
              height: "44px",
              borderRadius: "0.5rem",
            }}
            className="placeholder:text-[#7A6355] focus-visible:border-[#D97757]"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Label htmlFor="sector" style={{ color: "#E8DDD0", fontSize: "0.85rem" }}>
            Secteur d&apos;activité <span style={{ color: "#D97757" }}>*</span>
          </Label>
          <select
            id="sector"
            name="sector"
            required
            defaultValue=""
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#F5F0E8",
              height: "44px",
              borderRadius: "0.5rem",
              padding: "0 0.75rem",
              fontSize: "0.9rem",
            }}
            className="focus-visible:border-[#D97757]"
          >
            <option value="" disabled>Sélectionnez votre secteur</option>
            <option value="Mode">Mode</option>
            <option value="Sport & Outdoor">Sport & Outdoor</option>
            <option value="Décoration">Décoration</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Label htmlFor="email" style={{ color: "#E8DDD0", fontSize: "0.85rem" }}>
            Adresse email <span style={{ color: "#D97757" }}>*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vous@boutique.fr"
            required
            autoComplete="email"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#F5F0E8",
              height: "44px",
              borderRadius: "0.5rem",
            }}
            className="placeholder:text-[#7A6355] focus-visible:border-[#D97757]"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Label htmlFor="password" style={{ color: "#E8DDD0", fontSize: "0.85rem" }}>
            Mot de passe <span style={{ color: "#D97757" }}>*</span>
          </Label>
          <div style={{ position: "relative" }}>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
              autoComplete="new-password"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#F5F0E8",
                height: "44px",
                borderRadius: "0.5rem",
                paddingRight: "2.75rem",
              }}
              className="placeholder:text-[#7A6355] focus-visible:border-[#D97757]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#7A6355",
                display: "flex",
                alignItems: "center",
                padding: 0,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* RGPD */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
          <input
            id="gdprConsent"
            name="gdprConsent"
            type="checkbox"
            required
            aria-required="true"
            style={{
              marginTop: "0.2rem",
              flexShrink: 0,
              width: 16,
              height: 16,
              cursor: "pointer",
              accentColor: "#D97757",
            }}
          />
          <label
            htmlFor="gdprConsent"
            style={{ fontSize: "0.72rem", color: "#8A7468", lineHeight: 1.5, cursor: "pointer" }}
          >
            J&apos;accepte les{" "}
            <Link href="/cgv" style={{ color: "#D97757", textDecoration: "underline" }}>CGV</Link>
            {" "}et la{" "}
            <Link href="/confidentialite" style={{ color: "#D97757", textDecoration: "underline" }}>politique de confidentialité</Link>
            {" "}de CoYia SAS. Mes données seront traitées conformément au RGPD. Un accord de traitement des données (DPA) me sera proposé à la signature avant l&apos;activation de mon abonnement.
            {" "}<span style={{ color: "#D97757" }}>*</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            height: "48px",
            background: loading ? "rgba(217,119,87,0.5)" : "#D97757",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "0.625rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 180ms ease",
            marginTop: "0.25rem",
          }}
        >
          {loading ? "Création en cours..." : "Créer mon espace CoYia →"}
        </button>

      </form>

      {/* ─── Connexion Shopify ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0 0.625rem" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        <span style={{ color: "#5C4E45", fontSize: "0.72rem", flexShrink: 0 }}>ou</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
      </div>
      <a
        href="/api/auth/shopify"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "44px",
          padding: "0 1rem",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "0.625rem",
          color: "#F5F0E8",
          fontSize: "0.875rem",
          fontWeight: 500,
          textDecoration: "none",
          transition: "border-color 180ms ease",
          boxSizing: "border-box",
        }}
      >
        <span>Se connecter avec Shopify →</span>
        <span style={{
          width: 20,
          height: 20,
          background: "#96BF48",
          borderRadius: "4px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 800,
          color: "white",
          flexShrink: 0,
        }}>S</span>
      </a>

      <div style={{ marginTop: "1.75rem", textAlign: "center" }}>
        <p style={{ color: "#8A7468", fontSize: "0.875rem" }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: "#D97757", fontWeight: 600, textDecoration: "none" }}>
            Se connecter
          </Link>
        </p>
        <p style={{ color: "#7A6355", fontSize: "0.72rem", marginTop: "0.6rem" }}>
          ✓ 21 jours gratuit &nbsp;·&nbsp; ✓ Sans prélèvement avant la fin de l&apos;essai &nbsp;·&nbsp; ✓ RGPD natif
        </p>
      </div>

    </div>
  );
}
