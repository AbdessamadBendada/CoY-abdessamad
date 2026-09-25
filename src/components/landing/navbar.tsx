"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowSticky(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
          background: scrolled ? "rgba(245,240,232,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(43,37,35,0.10)"
            : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Logo variant="compact" colorScheme="light" size="sm" href="/register" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { href: "/help", label: "Aide" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  fontFamily: "var(--font-body)",
                  color: "#3E2A1A",
                  fontSize: "0.875rem",
                  opacity: 0.65,
                  transition: "opacity 0.2s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.65")
                }
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-2">
            <span
              style={{
                background: "rgba(43,37,35,0.06)",
                border: "1px solid rgba(43,37,35,0.12)",
                color: "#3E2A1A",
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "0.2rem 0.65rem",
                borderRadius: "9999px",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
              }}
            >
              Bêta — accès limité
            </span>

            <button
              onClick={toggleDark}
              aria-label={darkMode ? "Mode clair" : "Mode sombre"}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid rgba(43,37,35,0.15)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#3E2A1A",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(43,37,35,0.06)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              style={{
                color: "#3E2A1A",
                fontFamily: "var(--font-body)",
                opacity: 0.65,
                fontSize: "0.875rem",
              }}
            >
              <Link href="/login">Connexion</Link>
            </Button>

            <Button
              asChild
              size="sm"
              style={{
                background: "#D97757",
                color: "#F5F0E8",
                fontWeight: 600,
                border: "none",
                borderRadius: "8px",
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
              }}
              className="hover:opacity-90 transition-opacity"
            >
              <Link href="/register">Essai gratuit 21j</Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden"
            style={{ color: "#2B2523" }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            style={{
              background: "#F5F0E8",
              borderTop: "1px solid rgba(43,37,35,0.10)",
            }}
            className="md:hidden px-4 pb-6 pt-4 flex flex-col gap-4"
          >
            {[
              { href: "/help", label: "Aide" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  color: "#3E2A1A",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9rem",
                  opacity: 0.8,
                  textDecoration: "none",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              style={{
                color: "#3E2A1A",
                fontFamily: "var(--font-body)",
                fontSize: "0.9rem",
                opacity: 0.8,
              }}
              onClick={() => setMenuOpen(false)}
            >
              Connexion
            </Link>
            <Link
              href="/register"
              style={{
                background: "#D97757",
                color: "#F5F0E8",
                fontWeight: 600,
                padding: "0.75rem 1.25rem",
                borderRadius: "8px",
                textAlign: "center",
                fontFamily: "var(--font-body)",
                fontSize: "0.9rem",
              }}
              onClick={() => setMenuOpen(false)}
            >
              Essai gratuit 21j
            </Link>
          </div>
        )}
      </nav>

      {/* Sticky CTA — mobile, appears after 300px scroll */}
      {showSticky && !menuOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            padding: "0.75rem 1rem",
            background: "rgba(245,240,232,0.97)",
            borderTop: "1px solid rgba(43,37,35,0.10)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Link
            href="/register"
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              background: "#D97757",
              color: "#F5F0E8",
              fontWeight: 600,
              padding: "0.9rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontFamily: "var(--font-body)",
            }}
          >
            Essai gratuit 21j
          </Link>
        </div>
      )}
    </>
  );
}
