"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

const PRODUCT_LINKS = [
  { label: "Centre d'aide", href: "/help" },
];

const LEGAL_LINKS = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "CGV", href: "/cgv" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "DPA RGPD", href: "/dpa" },
];

const linkStyle: React.CSSProperties = {
  color: "rgba(245,240,232,0.5)",
  fontSize: "0.85rem",
  textDecoration: "none",
  lineHeight: 2,
  display: "block",
  transition: "color 0.2s",
};

const colHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "rgba(245,240,232,0.35)",
  fontSize: "0.62rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "1rem",
};

export function Footer() {
  return (
    <footer
      style={{
        background: "#2B2523",
        borderTop: "1px solid rgba(245,240,232,0.06)",
        padding: "4rem 0 2.5rem",
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1 — Brand */}
          <div className="col-span-2 md:col-span-1">
            <div style={{ marginBottom: "1rem" }}>
              <Logo variant="full" colorScheme="dark" size="sm" />
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "rgba(245,240,232,0.4)",
                fontSize: "0.82rem",
                lineHeight: 1.65,
                marginBottom: "1.25rem",
                maxWidth: 200,
              }}
            >
              L&apos;IA qui sauve vos clients avant qu&apos;ils ne partent.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {["Données isolées par compte", "Désinscription intégrée", "Décisions traçables"].map(
                (badge) => (
                  <span
                    key={badge}
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "rgba(245,240,232,0.35)",
                      fontSize: "0.75rem",
                    }}
                  >
                    {badge}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Col 2 — Produit */}
          <div>
            <p style={colHeadingStyle}>Produit</p>
            <nav>
              {PRODUCT_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  style={linkStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color =
                      "rgba(245,240,232,0.80)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color =
                      "rgba(245,240,232,0.5)")
                  }
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Col 3 — Légal */}
          <div>
            <p style={colHeadingStyle}>Légal</p>
            <nav>
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  style={linkStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color =
                      "rgba(245,240,232,0.80)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color =
                      "rgba(245,240,232,0.5)")
                  }
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 4 — Contact */}
          <div>
            <p style={colHeadingStyle}>Contact</p>
            <a
              href="mailto:contact@coyia.fr"
              style={linkStyle}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "rgba(245,240,232,0.80)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "rgba(245,240,232,0.5)")
              }
            >
              contact@coyia.fr
            </a>
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "rgba(245,240,232,0.32)",
                fontSize: "0.82rem",
                lineHeight: 1.8,
                marginTop: "0.5rem",
              }}
            >
              CoYia SAS
              <br />
              France 🇫🇷
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(245,240,232,0.06)",
            paddingTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "rgba(245,240,232,0.28)",
              fontSize: "0.75rem",
            }}
          >
            © 2026 CoYia SAS — Tous droits réservés
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              color: "rgba(245,240,232,0.22)",
              fontSize: "0.72rem",
            }}
          >
            Smart Tech, Human Touch.
          </p>
        </div>
      </div>
    </footer>
  );
}
