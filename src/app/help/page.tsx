import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { Zap, Target, Settings2, CreditCard } from "lucide-react";

export const metadata = {
  title: "Centre d'aide — CoY",
  description:
    "Guides, tutoriels et réponses aux questions fréquentes sur CoY. Démarrez, intégrez votre boutique et récupérez vos clients.",
};

const CATEGORIES = [
  {
    title: "Démarrage",
    description: "Créez votre compte et configurez CoY en moins de 48h.",
    icon: <Zap size={18} style={{ color: "#D97757", flexShrink: 0 }} />,
    articles: [
      {
        href: "/help/creer-votre-compte",
        title: "Créer votre compte et démarrer l'essai gratuit",
        duration: "3 min",
      },
      {
        href: "/help/connecter-votre-boutique",
        title: "Connecter votre boutique Shopify ou PrestaShop",
        duration: "5 min",
      },
    ],
  },
  {
    title: "Récupération clients",
    description: "Comprenez et configurez vos premières actions de récupération.",
    icon: <Target size={18} style={{ color: "#D97757", flexShrink: 0 }} />,
    articles: [
      {
        href: "/help/comprendre-le-score-de-churn",
        title: "Comprendre le score de risque churn (0–100)",
        duration: "4 min",
      },
      {
        href: "/help/premiere-action-de-recuperation",
        title: "Déclencher votre première action de récupération",
        duration: "5 min",
      },
    ],
  },
  {
    title: "Configuration & IA",
    description: "Personnalisez les messages et gérez les préférences de vos clients.",
    icon: <Settings2 size={18} style={{ color: "#D97757", flexShrink: 0 }} />,
    articles: [
      {
        href: "/help/personnaliser-vos-messages",
        title: "Personnaliser les emails et SMS de récupération",
        duration: "4 min",
      },
      {
        href: "/help/gerer-les-opt-out",
        title: "Gérer les opt-out et vos obligations RGPD",
        duration: "3 min",
      },
    ],
  },
  {
    title: "Compte & Facturation",
    description: "Passez à un plan payant et comprenez votre garantie ROI.",
    icon: <CreditCard size={18} style={{ color: "#D97757", flexShrink: 0 }} />,
    articles: [
      {
        href: "/help/passer-a-un-plan-payant",
        title: "Passer à un plan payant et gérer votre abonnement",
        duration: "3 min",
      },
      {
        href: "/help/garantie-roi-60-jours",
        title: "Comprendre et activer la garantie ROI 60 jours",
        duration: "3 min",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#F5F0E8", minHeight: "100vh", paddingTop: "5rem" }}>
        {/* Header */}
        <section
          style={{
            background: "#2B2523",
            padding: "4rem 1.5rem 3.5rem",
          }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "#E8B84B",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Centre d&apos;aide
            </p>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(2rem, 5vw, 3rem)",
                color: "#F5F0E8",
                lineHeight: 1.2,
                marginBottom: "1rem",
              }}
            >
              Comment pouvons-nous vous aider ?
            </h1>
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "rgba(245,240,232,0.55)",
                fontSize: "1rem",
                lineHeight: 1.65,
              }}
            >
              Guides pas-à-pas, tutoriels et réponses aux questions fréquentes.
              Trouvez ce dont vous avez besoin pour démarrer et maximiser votre ROI.
            </p>

            {/* Contact shortcut */}
            <div style={{ marginTop: "2rem" }}>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "rgba(245,240,232,0.4)",
                  fontSize: "0.82rem",
                }}
              >
                Vous ne trouvez pas ce que vous cherchez ?{" "}
                <a
                  href="mailto:contact@coyia.fr"
                  style={{ color: "#D97757", textDecoration: "none" }}
                >
                  Contactez-nous →
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section style={{ padding: "3.5rem 1.5rem 5rem" }}>
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.title}
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(43,37,35,0.08)",
                    borderRadius: "1.25rem",
                    padding: "1.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ display: "flex", alignItems: "center" }}>{cat.icon}</span>
                    <h2
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#2B2523",
                      }}
                    >
                      {cat.title}
                    </h2>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "rgba(43,37,35,0.5)",
                      fontSize: "0.82rem",
                      lineHeight: 1.55,
                      marginBottom: "1.25rem",
                    }}
                  >
                    {cat.description}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {cat.articles.map((article) => (
                      <li key={article.href}>
                        <Link
                          href={article.href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.6rem 0",
                            borderTop: "1px solid rgba(43,37,35,0.06)",
                            textDecoration: "none",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-body)",
                              color: "#2B2523",
                              fontSize: "0.88rem",
                              lineHeight: 1.4,
                            }}
                          >
                            {article.title}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-body)",
                              color: "rgba(43,37,35,0.35)",
                              fontSize: "0.72rem",
                              whiteSpace: "nowrap",
                              marginLeft: "1rem",
                              flexShrink: 0,
                            }}
                          >
                            {article.duration}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
