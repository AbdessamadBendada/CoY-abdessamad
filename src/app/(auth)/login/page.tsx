"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { login, resendConfirmationEmail } from "../actions";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const confirmed = searchParams.get("confirmed");
    const urlError = searchParams.get("error");
    const message = searchParams.get("message");

    if (confirmed === "true") {
      setSuccessMessage("Email confirmé avec succès ! Vous pouvez maintenant vous connecter.");
    }
    if (urlError === "callback_failed") {
      setError(message ? `Erreur de confirmation : ${decodeURIComponent(message)}` : "Erreur lors de la confirmation. Le lien a peut-être expiré.");
    }
    if (urlError === "confirmation_failed") {
      setError("Le lien de confirmation a expiré ou est invalide. Renvoyez-en un nouveau ci-dessous.");
      setErrorCode("EMAIL_NOT_CONFIRMED");
    }
    if (urlError === "missing_params") {
      setError("Lien invalide. Veuillez réessayer.");
    }
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setErrorCode(null);
    setResendSuccess(null);
    setSuccessMessage(null);
    setLoading(true);
    setEmailValue(formData.get("email") as string);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
        if ("code" in result) setErrorCode(result.code as string);
      }
    } catch {
      // redirect() throws — c'est normal
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    setResendLoading(true);
    setResendSuccess(null);
    const formData = new FormData();
    formData.set("email", emailValue);
    try {
      const result = await resendConfirmationEmail(formData);
      if (result?.error) setError(result.error);
      if (result?.success) {
        setResendSuccess(result.message);
        setError(null);
        setErrorCode(null);
      }
    } catch {
      setError("Erreur lors de l'envoi.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>

      {/* ─── Lien retour ────────────────────────────────────────── */}
      <a
        href="/register"
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          fontFamily: "var(--font-body)",
          fontSize: "0.8rem",
          color: "rgba(43,37,35,0.5)",
          textDecoration: "none",
          zIndex: 10,
        }}
      >
        ← Retour sur coyia.fr
      </a>

      {/* ─── Card principale ────────────────────────────────────── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "1.25rem",
          border: "1px solid rgba(43,37,35,0.08)",
          boxShadow: "0 4px 24px rgba(43,37,35,0.08)",
          padding: "2rem",
        }}
      >

        {/* ─── Logo : mascotte + wordmark ─────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Logo variant="full" colorScheme="light" size="lg" />
        </div>

        {/* ─── Titre ──────────────────────────────────────────── */}
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 400,
            fontSize: "clamp(1.6rem, 4vw, 1.9rem)",
            color: "#2B2523",
            marginBottom: "0.5rem",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Bon retour sur CoY.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "rgba(43,37,35,0.6)",
            fontSize: "0.9rem",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Vos alertes clients du jour vous attendent.
        </p>

        {/* ─── Messages état ──────────────────────────────────── */}
        {successMessage && (
          <div
            style={{
              background: "rgba(92,138,58,0.1)",
              border: "1px solid rgba(92,138,58,0.25)",
              borderRadius: "0.625rem",
              padding: "0.75rem 1rem",
              color: "#2D6A1F",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "rgba(192,68,42,0.08)",
              border: "1px solid rgba(192,68,42,0.2)",
              borderRadius: "0.625rem",
              padding: "0.75rem 1rem",
              color: "#B83520",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            <p>{error}</p>
            {errorCode === "EMAIL_NOT_CONFIRMED" && (
              <div style={{ marginTop: "0.75rem" }}>
                <Label
                  htmlFor="resend-email"
                  style={{ fontSize: "0.75rem", color: "rgba(43,37,35,0.7)" }}
                >
                  Saisissez votre email pour renvoyer la confirmation :
                </Label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="vous@boutique.fr"
                    className="h-8 text-xs"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(43,37,35,0.2)",
                      color: "#2B2523",
                    }}
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs whitespace-nowrap"
                    style={{
                      border: "1px solid rgba(217,119,87,0.4)",
                      color: "#D97757",
                      background: "transparent",
                    }}
                    onClick={handleResendConfirmation}
                    disabled={resendLoading || !emailValue}
                  >
                    {resendLoading ? "Envoi..." : "Renvoyer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {resendSuccess && (
          <div
            style={{
              background: "rgba(92,138,58,0.1)",
              border: "1px solid rgba(92,138,58,0.25)",
              borderRadius: "0.625rem",
              padding: "0.75rem 1rem",
              color: "#2D6A1F",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            ✓ {resendSuccess}
          </div>
        )}

        {/* ─── Formulaire ─────────────────────────────────────── */}
        <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <Label htmlFor="email" style={{ color: "rgba(43,37,35,0.75)", fontSize: "0.85rem" }}>
              Adresse email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="vous@boutique.fr"
              required
              autoComplete="email"
              onChange={(e) => setEmailValue(e.target.value)}
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(43,37,35,0.18)",
                color: "#2B2523",
                height: "44px",
                borderRadius: "0.5rem",
              }}
              className="placeholder:text-[#9E8E85] focus-visible:border-[#D97757]"
            />
          </div>

          {/* Mot de passe */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Label htmlFor="password" style={{ color: "rgba(43,37,35,0.75)", fontSize: "0.85rem" }}>
                Mot de passe
              </Label>
              <Link
                href="/forgot-password"
                style={{ fontSize: "0.78rem", color: "#D97757", textDecoration: "none" }}
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(43,37,35,0.18)",
                  color: "#2B2523",
                  height: "44px",
                  borderRadius: "0.5rem",
                  paddingRight: "2.75rem",
                }}
                className="placeholder:text-[#9E8E85] focus-visible:border-[#D97757]"
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
                  color: "rgba(43,37,35,0.4)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* CTA principal */}
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
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#C4654A"; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#D97757"; }}
          >
            {loading ? "Connexion en cours..." : "Accéder à mon espace →"}
          </button>

        </form>

        {/* ─── Footer liens ───────────────────────────────────── */}
        <div style={{ marginTop: "1.75rem", textAlign: "center" }}>
          <p style={{ color: "rgba(43,37,35,0.6)", fontSize: "0.875rem" }}>
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              style={{ color: "#D97757", fontWeight: 600, textDecoration: "none" }}
            >
              Démarrer votre essai gratuit →
            </Link>
          </p>
          <p style={{ color: "rgba(43,37,35,0.4)", fontSize: "0.72rem", marginTop: "0.6rem" }}>
            ✓ 21 jours gratuit &nbsp;·&nbsp; ✓ Sans prélèvement avant la fin de l&apos;essai
          </p>
        </div>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <a
            href="mailto:contact@coyia.fr"
            style={{ fontSize: "0.72rem", color: "rgba(43,37,35,0.35)", textDecoration: "none" }}
          >
            Problème technique ? contact@coyia.fr
          </a>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
