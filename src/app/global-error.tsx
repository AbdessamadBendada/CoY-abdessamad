"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const skew =
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("dynamically imported") ||
    error.message.includes("Failed to fetch");

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  useEffect(() => {
    if (!skew) return;
    const timer = setTimeout(() => window.location.reload(), 1500);
    return () => clearTimeout(timer);
  }, [skew]);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CoY</title>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "Sora, Avenir Next, sans-serif",
          background: "#f7f4ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            padding: "2rem 1rem",
            textAlign: "center",
            maxWidth: 480,
            background: "#fffdf9",
            border: "1px solid #e8e0dc",
            borderRadius: "1.25rem",
            boxShadow: "0 18px 50px rgba(53,36,56,0.1)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "0.75rem",
              background: skew ? "rgba(217,119,87,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${skew ? "rgba(217,119,87,0.2)" : "rgba(239,68,68,0.2)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            {skew ? "🔄" : "⚠"}
          </div>
          <div>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#2B2523", marginBottom: "0.25rem" }}>
              {skew ? "Nouvelle version disponible" : "Une erreur est survenue"}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#6B7280" }}>
              {skew
                ? "CoY vient d'être mis à jour. Rechargement en cours…"
                : "Une erreur inattendue s'est produite. Veuillez réessayer."}
            </p>
          </div>
          <button
            onClick={skew ? () => window.location.reload() : reset}
            style={{
              background: skew ? "#D97757" : "#2B2523",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {skew ? "Recharger maintenant" : "Réessayer"}
          </button>
        </div>
      </body>
    </html>
  );
}
