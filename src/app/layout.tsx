import type { Metadata } from "next";
import { Instrument_Serif, Sora, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CoY — l'agent Winback de CoYia | L'IA qui sauve vos clients avant qu'ils ne partent",
  description:
    "CoY détecte les signaux d'insatisfaction dans votre service client, score chaque client de 0 à 100, et déclenche automatiquement des actions de récupération. Essai gratuit 21 jours, sans prélèvement avant la fin de l'essai.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "CoY — Repérez les clients qui s'éloignent",
    description: "Un centre de pilotage pour détecter le risque, prioriser les clients et orchestrer les actions de récupération.",
    images: [{ url: "/images/coy-social-card.png", width: 1200, height: 630 }],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Préconnexion anticipée aux domaines critiques — élimine le RTT de négociation TLS */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://api.brevo.com" />
      </head>
      <body
        className={`${instrumentSerif.variable} ${sora.variable} ${cormorantGaramond.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
