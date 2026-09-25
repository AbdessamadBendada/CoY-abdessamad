"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [loading, setLoading] = useState(false);

  function handleLogout() {
    setLoading(true);
    // Route serveur — efface les cookies httpOnly côté serveur puis redirige vers /login.
    // Le JS browser (createBrowserClient) ne peut pas supprimer les cookies httpOnly
    // posés par le middleware → seul le serveur peut le faire via Set-Cookie headers.
    window.location.href = "/api/auth/signout";
  }

  if (collapsed) {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        title="Se déconnecter"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem",
          borderRadius: "0.4rem",
          fontSize: "0.82rem",
          color: loading ? "rgba(245,240,232,0.25)" : "#D97757",
          background: "transparent",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLElement).style.color = "#D97757";
            (e.currentTarget as HTMLElement).style.background = "rgba(217,119,87,0.08)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "#D97757";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <LogOut style={{ width: 15, height: 15 }} />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        width: "100%",
        padding: "0.45rem 0.75rem",
        borderRadius: "0.4rem",
        fontSize: "0.82rem",
        fontWeight: 500,
        color: loading ? "rgba(245,240,232,0.25)" : "#D97757",
        background: "transparent",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          (e.currentTarget as HTMLElement).style.color = "#D97757";
          (e.currentTarget as HTMLElement).style.background = "rgba(217,119,87,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#D97757";
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {loading ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}
