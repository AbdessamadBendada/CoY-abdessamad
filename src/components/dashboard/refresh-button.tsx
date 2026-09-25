"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.refresh()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        fontSize: "0.78rem",
        fontWeight: 500,
        color: "#6B7280",
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: "0.5rem",
        padding: "0.375rem 0.75rem",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "#F9FAFB";
        (e.currentTarget as HTMLButtonElement).style.color = "#2B2523";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "#fff";
        (e.currentTarget as HTMLButtonElement).style.color = "#6B7280";
      }}
    >
      <RefreshCw style={{ width: 12, height: 12 }} />
      Actualiser
    </button>
  );
}
