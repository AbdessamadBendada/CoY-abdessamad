"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "../actions";

const RADAR_LOGO = (
  <svg width="64" height="64" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
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

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await forgotPassword(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.message);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
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
          fontSize: "clamp(1.5rem, 4vw, 1.875rem)",
          color: "#F5F0E8",
          marginBottom: "0.5rem",
          textAlign: "center",
          lineHeight: 1.25,
        }}
      >
        Réinitialiser votre mot de passe.
      </h1>
      <p style={{ color: "#B8A898", fontSize: "0.875rem", textAlign: "center", marginBottom: "2rem" }}>
        Saisissez votre email pour recevoir un lien de réinitialisation.
      </p>

      {/* ─── Succès ─────────────────────────────────────────────── */}
      {success ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              background: "rgba(92, 138, 58, 0.15)",
              border: "1px solid rgba(92, 138, 58, 0.3)",
              borderRadius: "0.625rem",
              padding: "0.875rem 1rem",
              color: "#A8D070",
              fontSize: "0.875rem",
            }}
          >
            ✓ {success}
          </div>
          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "44px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "0.625rem",
              color: "#E8DDD0",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              background: "transparent",
            }}
          >
            ← Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
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

          <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <Label htmlFor="email" style={{ color: "#E8DDD0", fontSize: "0.85rem" }}>
                Adresse email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@entreprise.fr"
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
              }}
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien →"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link
              href="/login"
              style={{ fontSize: "0.85rem", color: "#8A7468", textDecoration: "none" }}
            >
              ← Revenir à la connexion
            </Link>
          </div>
        </>
      )}

    </div>
  );
}
