"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

export function DpaPendingBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: "#E8B84B",
        color: "#2B2523",
        padding: "0.625rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <FileText size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.4 }}>
          <strong>DPA en attente</strong> — Pour envoyer des actions de récupération et activer votre plan, signez votre accord de traitement des données.
        </p>
      </div>
      <Link
        href="/dpa"
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "#2B2523",
          textDecoration: "none",
          border: "1.5px solid rgba(43,37,35,0.4)",
          borderRadius: "0.375rem",
          padding: "0.25rem 0.875rem",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Signer le DPA →
      </Link>
    </div>
  );
}
