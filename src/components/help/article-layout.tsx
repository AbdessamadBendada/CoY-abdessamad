import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import type { ReactNode } from "react";

interface HelpArticleLayoutProps {
  category: string;
  title: string;
  duration: string;
  children: ReactNode;
}

export function HelpArticleLayout({
  category,
  title,
  duration,
  children,
}: HelpArticleLayoutProps) {
  return (
    <>
      <Navbar />
      <main style={{ background: "#F5F0E8", minHeight: "100vh", paddingTop: "5rem" }}>
        {/* Breadcrumb */}
        <div style={{ padding: "1.5rem 1.5rem 0" }}>
          <div className="max-w-2xl mx-auto">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link
                href="/help"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "#D97757",
                  fontSize: "0.82rem",
                  textDecoration: "none",
                }}
              >
                Centre d&apos;aide
              </Link>
              <span style={{ color: "rgba(43,37,35,0.3)", fontSize: "0.82rem" }}>›</span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  color: "rgba(43,37,35,0.45)",
                  fontSize: "0.82rem",
                }}
              >
                {category}
              </span>
            </div>
          </div>
        </div>

        {/* Article */}
        <article style={{ padding: "2rem 1.5rem 5rem" }}>
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <header style={{ marginBottom: "2.5rem" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "#D97757",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "rgba(217,119,87,0.08)",
                    border: "1px solid rgba(217,119,87,0.18)",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                  }}
                >
                  {category}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "rgba(43,37,35,0.4)",
                    fontSize: "0.75rem",
                  }}
                >
                  {duration} de lecture
                </span>
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  color: "#2B2523",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
            </header>

            {/* Content */}
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(43,37,35,0.08)",
                borderRadius: "1.25rem",
                padding: "2.5rem",
              }}
            >
              {children}
            </div>

            {/* Footer nav */}
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Link
                href="/help"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "#D97757",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                }}
              >
                ← Retour au centre d&apos;aide
              </Link>
              <Link
                href="/register"
                style={{
                  fontFamily: "var(--font-body)",
                  background: "#D97757",
                  color: "#F5F0E8",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  padding: "0.55rem 1.25rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                Démarrer l&apos;essai gratuit →
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

// Shared prose style helpers
export const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  fontSize: "1.05rem",
  color: "#2B2523",
  marginTop: "1.75rem",
  marginBottom: "0.65rem",
};

export const pStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "rgba(43,37,35,0.7)",
  fontSize: "0.92rem",
  lineHeight: 1.75,
  marginBottom: "1rem",
};

export const liStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "rgba(43,37,35,0.7)",
  fontSize: "0.92rem",
  lineHeight: 1.7,
  marginBottom: "0.4rem",
};

export const calloutStyle: React.CSSProperties = {
  background: "rgba(232,184,75,0.08)",
  border: "1px solid rgba(232,184,75,0.25)",
  borderRadius: "0.5rem",
  padding: "1rem 1.25rem",
  marginTop: "1.25rem",
  marginBottom: "1.25rem",
};
