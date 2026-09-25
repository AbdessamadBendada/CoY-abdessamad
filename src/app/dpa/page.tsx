export const dynamic = "force-dynamic";


import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DpaForm } from "./dpa-form";

export default async function DpaPage() {
  const user = await requireAuth();

  if (user.tenant.dpaSignedAt !== null) {
    redirect("/overview");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-2xl w-full space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Accord de Traitement des Données (DPA)
          </h1>
          <p className="text-muted-foreground mt-1">
            Conformément au RGPD, vous devez signer cet accord avant d&apos;utiliser CoY.
          </p>
        </div>

        {/* Corps du DPA */}
        <div className="rounded-lg border bg-card p-6 space-y-4 text-sm text-muted-foreground max-h-96 overflow-y-auto">
          <p className="font-semibold text-foreground">
            Entre : CoYia SAS (ci-après «&nbsp;le Sous-Traitant&nbsp;») et votre entreprise (ci-après «&nbsp;le Responsable de Traitement&nbsp;»)
          </p>

          <section>
            <h2 className="font-semibold text-foreground">1. Objet</h2>
            <p>
              Le présent DPA définit les conditions dans lesquelles CoYia SAS traite les données
              personnelles de vos clients finaux pour vous fournir le service CoY
              (détection d&apos;insatisfaction, scoring churn, actions de récupération).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">2. Nature des données traitées</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Données d&apos;identification (nom, prénom, email, téléphone)</li>
              <li>Données de commandes (montants, fréquence, historique)</li>
              <li>Données de conversations service client</li>
              <li>Scores comportementaux calculés par l&apos;IA</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">3. Finalités du traitement</h2>
            <p>
              Les données sont traitées exclusivement pour la fourniture du service CoY :
              analyse de sentiment, scoring du risque de churn, génération de messages de récupération
              personnalisés.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">4. Hébergement et transferts</h2>
            <p>
              Les données sont hébergées au sein de l&apos;Union Européenne (Supabase Frankfurt, Vercel EU).
              Aucun transfert vers des pays tiers n&apos;est effectué sans garanties appropriées.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">5. Durée de conservation</h2>
            <p>
              Les données sont conservées pendant la durée du contrat et jusqu&apos;à 30 jours après
              sa résiliation, délai nécessaire à la suppression complète.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">6. Droits des personnes concernées</h2>
            <p>
              En tant que Responsable de Traitement, vous êtes seul habilité à répondre aux
              demandes de droit d&apos;accès, rectification, opposition et suppression de vos clients finaux.
              CoYia SAS s&apos;engage à vous assister dans ces démarches dans un délai de 72h.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">7. IA et décision automatisée</h2>
            <p>
              Conformément à l&apos;AI Act 2026, tout message généré par CoY inclut la mention
              obligatoire «&nbsp;Message personnalisé avec l&apos;assistance de notre IA&nbsp;».
              Vos clients disposent d&apos;un droit d&apos;opposition au scoring automatisé.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground">8. Sécurité</h2>
            <p>
              CoYia SAS met en œuvre des mesures techniques et organisationnelles appropriées :
              chiffrement en transit (TLS 1.3), accès restreints par rôles, journalisation des accès,
              tests d&apos;intrusion annuels.
            </p>
          </section>

          <p className="text-xs">
            Version 1.0 — Mars 2026. Ce DPA sera mis à jour avec la signature électronique Yousign
            dès la version de production (remplace la présente acceptation en ligne).
          </p>
        </div>

        {/* Formulaire */}
        <DpaForm />

        <p className="text-xs text-center text-muted-foreground">
          Pour toute question sur ce DPA, contactez notre DPO à{" "}
          <span className="font-medium">dpo@coyia.fr</span>
        </p>
      </div>
    </div>
  );
}
