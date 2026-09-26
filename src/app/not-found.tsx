import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CoyIllustration } from "@/components/coy-illustration";

export const metadata = {
  title: "Page introuvable — CoY · Winback Agent",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "4rem" }}>
        <section
          style={{
            background: "#F5F0E8",
            minHeight: "calc(100dvh - 4rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4rem 1rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "480px" }}>
            <CoyIllustration size={120} scene="enquete-sav" />

            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                fontSize: "clamp(4rem, 12vw, 7rem)",
                color: "#D97757",
                lineHeight: 1,
                opacity: 0.2,
                marginTop: "1.25rem",
                marginBottom: "-0.25rem",
              }}
            >
              404
            </p>

            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 400,
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                color: "#2B2523",
                lineHeight: 1.2,
                marginBottom: "0.75rem",
              }}
            >
              Cette page n&apos;existe pas.
            </h1>

            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "#3E2A1A",
                fontSize: "0.95rem",
                lineHeight: 1.65,
                opacity: 0.55,
                marginBottom: "2.25rem",
              }}
            >
              CoY a cherché partout — même dans les tickets SAV.
              <br />
              Rien à signaler à cette adresse.
            </p>

            <Link
              href="/"
              style={{
                display: "inline-block",
                background: "#D97757",
                color: "#F5F0E8",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.95rem",
                padding: "0.8rem 1.75rem",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
