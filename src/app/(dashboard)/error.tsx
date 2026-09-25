"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isSkewError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    error.message.includes("dynamically imported") ||
    error.message.includes("Failed to fetch")
  );
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const skew = isSkewError(error);

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  // Auto-reload après 1.5s si erreur de skew (nouvelle version déployée)
  useEffect(() => {
    if (!skew) return;
    const timer = setTimeout(() => window.location.reload(), 1500);
    return () => clearTimeout(timer);
  }, [skew]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "3rem 1rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "0.75rem",
          background: skew ? "rgba(232,184,75,0.10)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${skew ? "rgba(232,184,75,0.2)" : "rgba(239,68,68,0.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
        }}
      >
        {skew ? "🔄" : "⚠"}
      </div>
      <div>
        {skew ? (
          <>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#2B2523", marginBottom: "0.25rem" }}>
              Nouvelle version disponible
            </p>
            <p style={{ fontSize: "0.85rem", color: "#6B7280", maxWidth: 380 }}>
              CoY vient d&apos;être mis à jour. Rechargement en cours…
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#2B2523", marginBottom: "0.25rem" }}>
              Une erreur est survenue
            </p>
            <p style={{ fontSize: "0.85rem", color: "#6B7280", maxWidth: 380 }}>
              Le tableau de bord n&apos;a pas pu se charger. Cela peut être lié à une interruption
              temporaire de la base de données.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.75rem",
                  color: "#DC2626",
                  fontFamily: "monospace",
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  maxWidth: 480,
                  wordBreak: "break-all",
                }}
              >
                {error.message}
                {error.digest && <> · digest: {error.digest}</>}
              </p>
            )}
          </>
        )}
      </div>
      <Button
        onClick={skew ? () => window.location.reload() : reset}
        size="sm"
        style={skew ? { background: "#D97757" } : {}}
      >
        {skew ? "Recharger maintenant" : "Réessayer"}
      </Button>
    </div>
  );
}
