import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plug, Users } from "lucide-react";

const iconWrapStyle = {
  width: 48,
  height: 48,
  borderRadius: "0.75rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
} as const;

type Props = {
  hasActiveIntegration: boolean;
  activeIntegrationTypes: string[];
};

export function CustomersEmptyState({
  hasActiveIntegration,
  activeIntegrationTypes,
}: Props) {
  if (!hasActiveIntegration) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div style={{ ...iconWrapStyle, background: "rgba(232,184,75,0.12)", border: "1px solid rgba(232,184,75,0.2)" }}>
            <Plug style={{ width: 22, height: 22, color: "#E8B84B" }} />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">
              Connectez vos outils pour activer la détection
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Gorgias, Shopify ou PrestaShop — CoYia commence à surveiller
              vos clients dès la première connexion. Setup guidé, sans développeur.
            </p>
          </div>
          <Link href="/integrations">
            <Button size="sm">Connecter une intégration</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const integrationLabel =
    activeIntegrationTypes.length > 0
      ? activeIntegrationTypes
          .map((t) => t.charAt(0) + t.slice(1).toLowerCase())
          .join(", ")
      : "votre intégration";

  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        <div style={{ ...iconWrapStyle, background: "rgba(92,138,58,0.10)", border: "1px solid rgba(92,138,58,0.2)" }}>
          <Users style={{ width: 22, height: 22, color: "#5C8A3A" }} />
        </div>
        <div>
          <h3 className="font-semibold text-base mb-1">
            Analyse en cours
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {integrationLabel} est connecté. CoYia analyse vos conversations
            et identifie les clients à risque — les premiers résultats arrivent
            sous 24h.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          La première synchronisation peut prendre quelques heures selon le volume.
        </p>
      </CardContent>
    </Card>
  );
}

type FilterEmptyProps = {
  onReset: () => void;
};

export function CustomersFilterEmpty({ onReset }: FilterEmptyProps) {
  return (
    <div className="text-center py-12 space-y-3">
      <p className="text-sm text-muted-foreground">
        Aucun client ne correspond à ce filtre.
      </p>
      <Button variant="outline" size="sm" onClick={onReset}>
        Voir tous les clients
      </Button>
    </div>
  );
}
