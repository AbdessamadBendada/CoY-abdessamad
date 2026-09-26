"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/shared/utils/get-app-url";

interface WooCommerceWebhookDrawerProps {
  open: boolean;
  onClose: () => void;
  integrationId: string;
  webhookSecret: string;
}

export function WooCommerceWebhookDrawer({
  open,
  onClose,
  integrationId,
  webhookSecret,
}: WooCommerceWebhookDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const appUrl = getAppUrl();
  const webhookUrl = `${appUrl}/api/webhooks/woocommerce?integrationId=${integrationId}`;

  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Clipboard API non disponible
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Configuration du webhook WooCommerce</SheetTitle>
          <SheetDescription>
            Suivez ces 3 étapes dans votre WooCommerce Admin pour activer la
            réception des commandes en temps réel.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Avertissement secret one-time */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Important —</strong> Le secret ci-dessous ne sera plus
              affiché après fermeture. Copiez-le maintenant.
            </p>
          </div>

          {/* Étape 1 — URL webhook */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mr-1.5">
                1
              </span>
              URL du webhook
            </p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-[0.65rem] bg-muted px-2 py-1.5 rounded break-all select-all font-mono border">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, "url")}
                className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border"
                aria-label="Copier l'URL"
              >
                {copiedField === "url" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Étape 2 — Secret (one-time) */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mr-1.5">
                2
              </span>
              Secret webhook{" "}
              <span className="text-xs text-amber-600 font-normal ml-1">
                (affiché une seule fois)
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-[0.65rem] bg-muted px-2 py-1.5 rounded break-all select-all font-mono border">
                {webhookSecret}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookSecret, "secret")}
                className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border"
                aria-label="Copier le secret"
              >
                {copiedField === "secret" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Étape 3 — Instructions WooCommerce Admin */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mr-1.5">
                3
              </span>
              Configurer dans WooCommerce Admin
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 ml-6 list-decimal">
              <li>
                Allez dans{" "}
                <strong>WooCommerce → Réglages → Avancé → Webhooks</strong>
              </li>
              <li>
                Cliquez sur <strong>Ajouter un webhook</strong>
              </li>
              <li>
                Nom : <em>CoY</em>
              </li>
              <li>
                Statut : <strong>Actif</strong>
              </li>
              <li>
                Sujet : <strong>Commande créée</strong> (répétez pour{" "}
                <strong>Commande mise à jour</strong>)
              </li>
              <li>URL de livraison : collez l&apos;URL copiée à l&apos;étape 1</li>
              <li>Secret : collez le secret copié à l&apos;étape 2</li>
              <li>
                Cliquez sur <strong>Enregistrer le webhook</strong>
              </li>
            </ol>
            <a
              href="https://woocommerce.com/document/webhooks/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              Documentation WooCommerce Webhooks{" "}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t">
          <Button onClick={onClose} className="w-full">
            J&apos;ai copié mon secret — fermer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
