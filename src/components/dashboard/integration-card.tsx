"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  ShoppingBag,
  Store,
  Headphones,
  ShoppingCart,
  MessageCircle,
  LifeBuoy,
  Clock,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from "lucide-react";

// Instancié une seule fois au niveau module — évite la recréation à chaque rendu
const syncDateFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  connectIntegration,
  disconnectIntegration,
  revealPrestashopApiKey,
  revealWooCommerceCredentials,
  regenerateWooCommerceWebhookSecret,
} from "@/app/(dashboard)/integrations/actions";
import { ShopifySetupDrawer } from "@/components/dashboard/shopify-setup-drawer";
import { CrispSetupDrawer } from "@/components/dashboard/crisp-setup-drawer";
import { WooCommerceWebhookDrawer } from "@/components/dashboard/woocommerce-webhook-drawer";
import { isIntegrationActive } from "@/lib/config/active-integrations";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationType = "GORGIAS" | "SHOPIFY" | "PRESTASHOP" | "ZENDESK" | "FRESHDESK" | "WOOCOMMERCE" | "CRISP";
type IntegrationStatus = "PENDING" | "ACTIVE" | "ERROR" | "DISCONNECTED";

type ExistingIntegration = {
  id: string;
  status: IntegrationStatus;
  displayName: string | null;
  lastSyncAt: Date | null;
  lastError: string | null;
} | null;

type IntegrationCardProps = {
  type: IntegrationType;
  existingIntegration: ExistingIntegration;
  disabled: boolean; // quota atteint
  tenantId: string;
};

// ─── Metadata par type ────────────────────────────────────────────────────────

const INTEGRATION_META: Record<
  IntegrationType,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    timeEstimate: string;
    authType: string;
    stepsCount: number;
    comingSoon: boolean;
    note?: string;
  }
> = {
  GORGIAS: {
    label: "Gorgias",
    description: "Helpdesk e-commerce — détection automatique des tickets d'insatisfaction",
    icon: MessageSquare,
    timeEstimate: "12–16 min",
    authType: "OAuth 2.0",
    stepsCount: 4,
    comingSoon: false,
  },
  SHOPIFY: {
    label: "Shopify",
    description: "Plateforme e-commerce — détection des annulations, remboursements et retours",
    icon: ShoppingBag,
    timeEstimate: "18–25 min",
    authType: "OAuth 2.0",
    stepsCount: 6,
    comingSoon: false,
  },
  PRESTASHOP: {
    label: "PrestaShop",
    description: "Plateforme e-commerce — synchronisation planifiée des commandes et clients",
    icon: Store,
    timeEstimate: "30–40 min",
    authType: "Webservice API",
    stepsCount: 8,
    comingSoon: false,
  },
  ZENDESK: {
    label: "Zendesk",
    description: "Helpdesk multi-canal — gestion des tickets et support client centralisé",
    icon: LifeBuoy,
    timeEstimate: "10–14 min",
    authType: "OAuth / Token",
    stepsCount: 4,
    comingSoon: true,
  },
  FRESHDESK: {
    label: "Freshdesk",
    description: "Helpdesk — gestion des tickets et support client simplifié",
    icon: Headphones,
    timeEstimate: "6–8 min",
    authType: "Clé API",
    stepsCount: 3,
    comingSoon: true,
  },
  WOOCOMMERCE: {
    label: "WooCommerce",
    description: "E-commerce WordPress — synchronisation des commandes et clients",
    icon: ShoppingCart,
    timeEstimate: "8–12 min",
    authType: "Clé API",
    stepsCount: 4,
    comingSoon: false,
  },
  CRISP: {
    label: "Crisp",
    description: "Chat & helpdesk — conversations clients et support en temps réel",
    icon: MessageCircle,
    timeEstimate: "12–15 min",
    authType: "Token API",
    stepsCount: 5,
    comingSoon: false,
  },
};

// ─── Formulaires de connexion ─────────────────────────────────────────────────

function GorgiasOAuthForm({ onCancel }: { onCancel: () => void }) {
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function handleConnect() {
    const value = subdomain.trim().toLowerCase();
    if (!value) {
      setError("Veuillez saisir votre sous-domaine Gorgias.");
      return;
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*$/.test(value)) {
      setError("Format invalide. Exemple : maboutique");
      return;
    }
    setLoading(true);
    window.location.href = `/api/gorgias/oauth/install?subdomain=${encodeURIComponent(value)}`;
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="gorgias-subdomain">
          Sous-domaine Gorgias <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-1">
          <Input
            id="gorgias-subdomain"
            value={subdomain}
            onChange={(e) => { setSubdomain(e.target.value); setError(null); }}
            placeholder="maboutique"
            disabled={loading}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">.gorgias.com</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Vous serez redirigé vers Gorgias pour autoriser l&apos;accès en toute sécurité.
        </p>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? "Redirection..." : "Connecter avec Gorgias →"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function ShopifyOAuthForm({ onCancel }: { onCancel: () => void }) {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConnect() {
    const normalized = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!normalized) {
      setError("Veuillez saisir votre domaine Shopify.");
      return;
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(normalized)) {
      setError("Format invalide. Exemple : maboutique.myshopify.com");
      return;
    }
    setLoading(true);
    window.location.href = `/api/shopify/oauth/install?shop=${encodeURIComponent(normalized)}`;
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="shopify-domain">
          Domaine boutique <span className="text-destructive">*</span>
        </Label>
        <Input
          id="shopify-domain"
          value={shop}
          onChange={(e) => { setShop(e.target.value); setError(null); }}
          placeholder="maboutique.myshopify.com"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Vous serez redirigé vers Shopify pour autoriser l&apos;accès en toute sécurité.
        </p>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? "Redirection..." : "Connecter avec Shopify →"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function PrestaShopForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
        La connexion fonctionne par lecture sécurisée du Webservice PrestaShop.
        Aucun module à télécharger n’est nécessaire pour cette version.
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ps-domain">
          URL de votre boutique <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ps-domain"
          name="shop_domain"
          placeholder="https://maboutique.fr"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ps-key">
          Clé API <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ps-key"
          name="api_key"
          type="password"
          placeholder="••••••••••••••••"
          required
        />
        <p className="text-xs text-muted-foreground">
          Back-office PrestaShop → Paramètres avancés → Webservice → Ajouter une clé
        </p>
      </div>
      <FormActions onCancel={onCancel} />
    </div>
  );
}

function WooCommerceForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="woo-url">
          URL de la boutique <span className="text-destructive">*</span>
        </Label>
        <Input
          id="woo-url"
          name="site_url"
          placeholder="https://maboutique.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="woo-ck">
          Clé consommateur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="woo-ck"
          name="consumer_key"
          type="password"
          placeholder="ck_••••••••••••••••"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="woo-cs">
          Secret consommateur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="woo-cs"
          name="consumer_secret"
          type="password"
          placeholder="cs_••••••••••••••••"
          required
        />
        <p className="text-xs text-muted-foreground">
          WooCommerce Admin → Extensions → Clés API. Permission : <strong>Lecture</strong> suffit.
        </p>
      </div>
      <FormActions onCancel={onCancel} />
    </div>
  );
}

function CrispForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="crisp-wid">
          Website ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="crisp-wid"
          name="website_id"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          required
        />
        <p className="text-xs text-muted-foreground">
          Crisp → Paramètres → Espace de travail → Mise en place et intégrations
        </p>
      </div>
      <FormActions onCancel={onCancel} />
    </div>
  );
}

function FormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <Button type="submit" size="sm" className="flex-1">
        Tester &amp; Activer
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

const STATUS_BADGE_CONFIG: Record<IntegrationStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:       { label: "Connecté",    bg: "rgba(92,138,58,0.10)",   color: "#5C8A3A" },
  PENDING:      { label: "En attente",  bg: "rgba(232,184,75,0.12)",  color: "#C99A30" },
  ERROR:        { label: "Erreur",      bg: "rgba(192,68,42,0.08)",   color: "#C0442A" },
  DISCONNECTED: { label: "Déconnecté", bg: "rgba(122,99,85,0.08)",    color: "#7A6355" },
};

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config = STATUS_BADGE_CONFIG[status];
  return (
    <span
      style={{ background: config.bg, color: config.color }}
      className="text-xs px-2 py-0.5 rounded-full font-medium"
    >
      {config.label}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function IntegrationCard({
  type,
  existingIntegration,
  disabled,
  tenantId,
}: IntegrationCardProps) {
  const router = useRouter();
  const meta = INTEGRATION_META[type];
  const comingSoon = meta.comingSoon || !isIntegrationActive(type);
  const Icon = meta.icon;

  const isActive =
    existingIntegration?.status === "ACTIVE";
  const isError =
    existingIntegration?.status === "ERROR";
  const showForm =
    !isActive || isError;

  const [formOpen, setFormOpen] = useState(
    // Ouvrir le formulaire si erreur ou non connecté
    (!existingIntegration || isError) && !disabled
  );
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [revealedWooKey, setRevealedWooKey] = useState<string | null>(null);
  const [showWooKey, setShowWooKey] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [wooDrawerOpen, setWooDrawerOpen] = useState(false);
  const [wooDrawerSecret, setWooDrawerSecret] = useState("");
  const [wooDrawerIntegrationId, setWooDrawerIntegrationId] = useState("");
  const [regeneratingWoo, setRegeneratingWoo] = useState(false);

  // P3 — async clipboard avec catch (pas de faux positif "Copié ✓")
  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // API Clipboard refusée (HTTP non-localhost, Permissions-Policy) — silence intentionnel
    }
  }

  // P1 — reveal via Server Action (la clé ne transite jamais dans le HTML initial)
  async function handleRevealApiKey() {
    if (!existingIntegration) return;
    setRevealing(true);
    setRevealError(null);
    const result = await revealPrestashopApiKey(existingIntegration.id);
    setRevealing(false);
    if ("error" in result) {
      setRevealError(result.error); // P4 — message explicite si échec
    } else {
      setRevealedApiKey(result.key);
      setShowApiKey(true);
    }
  }

  async function handleRevealWooKey() {
    if (!existingIntegration) return;
    setRevealing(true);
    setRevealError(null);
    const result = await revealWooCommerceCredentials(existingIntegration.id);
    setRevealing(false);
    if ("error" in result) {
      setRevealError(result.error);
    } else {
      setRevealedWooKey(result.consumerKey);
      setShowWooKey(true);
    }
  }

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);

    const result = await connectIntegration(formData);

    setSubmitting(false);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    setFormOpen(false);

    // WooCommerce — ouvrir le drawer one-time avec le secret webhook
    if (
      type === "WOOCOMMERCE" &&
      "webhookSecret" in result &&
      result.webhookSecret &&
      "webhookIntegrationId" in result &&
      result.webhookIntegrationId
    ) {
      setWooDrawerSecret(result.webhookSecret);
      setWooDrawerIntegrationId(result.webhookIntegrationId);
      setWooDrawerOpen(true);
    }

    router.refresh();
  }

  async function handleDisconnect() {
    if (!existingIntegration) return;
    setDisconnecting(true);
    setActionError(null);

    const result = await disconnectIntegration(existingIntegration.id);

    setDisconnecting(false);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    setFormOpen(true);
    router.refresh();
  }

  async function handleRegenerateWooSecret() {
    if (!existingIntegration) return;
    setRegeneratingWoo(true);
    setActionError(null);
    const result = await regenerateWooCommerceWebhookSecret(existingIntegration.id);
    setRegeneratingWoo(false);
    if ("error" in result) {
      setActionError(result.error);
    } else {
      setWooDrawerSecret(result.webhookSecret);
      setWooDrawerIntegrationId(existingIntegration.id);
      setWooDrawerOpen(true);
    }
  }

  return (
    <Card className={cn(disabled && !isActive && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: comingSoon ? "rgba(100,116,139,0.08)" : "#F5F0E8",
                border: `1px solid ${comingSoon ? "rgba(100,116,139,0.15)" : "rgba(217,119,87,0.3)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-hidden
            >
              <Icon size={18} style={{ color: comingSoon ? "#9CA3AF" : "#D97757" }} />
            </div>
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {meta.description}
              </CardDescription>
            </div>
          </div>
          {existingIntegration && (
            <StatusBadge status={existingIntegration.status} />
          )}
          {comingSoon && (
            <span
              style={{
                background: "rgba(100,116,139,0.1)",
                color: "#64748B",
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid rgba(100,116,139,0.2)",
                whiteSpace: "nowrap",
              }}
            >
              Bientôt disponible
            </span>
          )}
        </div>
        {!comingSoon && (!existingIntegration?.status || existingIntegration.status !== "ACTIVE") ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.5rem" }}>
            <Clock size={11} style={{ color: "#9CA3AF", flexShrink: 0 }} />
            <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
              {meta.timeEstimate} · {meta.authType} · {meta.stepsCount} étapes
            </span>
          </div>
        ) : null}
        {meta.note && !existingIntegration && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.3rem", marginTop: "0.25rem" }}>
            <AlertTriangle size={11} style={{ color: "#F59E0B", flexShrink: 0, marginTop: "0.1rem" }} />
            <p style={{ fontSize: "0.68rem", color: "#F59E0B", margin: 0 }}>
              {meta.note}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Coming soon — intégrations P2 */}
        {comingSoon && (
          <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
            Cette intégration sera disponible prochainement. Nous vous notifierons par email dès son lancement.
          </p>
        )}

        {/* Message quota atteint */}
        {!comingSoon && disabled && !isActive && (
          <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
            Limite d&apos;intégrations atteinte pour votre plan. Passez à un plan supérieur pour en ajouter d&apos;autres.
          </p>
        )}

        {/* Intégration active — infos + déconnexion */}
        {!comingSoon && isActive && (
          <div className="space-y-2">
            {existingIntegration?.displayName && (
              <p className="text-xs text-muted-foreground">
                {type === "CRISP" ? "Website ID" : "Boutique"} :{" "}
                <span className="font-medium text-foreground">{existingIntegration.displayName}</span>
              </p>
            )}
            {existingIntegration?.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Dernière sync :{" "}
                {syncDateFmt.format(new Date(existingIntegration.lastSyncAt))}
              </p>
            )}
            {type === "PRESTASHOP" && existingIntegration && (
              <div className="space-y-2">
                <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Synchronisation automatique toutes les 30 minutes via le
                  Webservice PrestaShop.
                </p>

                {/* Integration ID */}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Integration ID :</p>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-[0.65rem] bg-muted px-2 py-1 rounded break-all select-all font-mono">
                      {existingIntegration.id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(existingIntegration.id, "id")}
                      className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copier l'Integration ID"
                    >
                      {copiedField === "id" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Clé API — P1 reveal on demand, P5 dots fixes à 24 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Clé API :</p>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-[0.65rem] bg-muted px-2 py-1 rounded break-all select-all font-mono">
                      {revealedApiKey && showApiKey ? revealedApiKey : "•".repeat(24)}
                    </code>
                    {!revealedApiKey ? (
                      <button
                        type="button"
                        onClick={handleRevealApiKey}
                        disabled={revealing}
                        className="shrink-0 px-2 py-1 text-[0.65rem] rounded border border-input bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        aria-label="Révéler la clé API"
                      >
                        {revealing ? "…" : "Révéler"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowApiKey((v) => !v)}
                          className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showApiKey ? "Masquer la clé API" : "Afficher la clé API"}
                        >
                          {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(revealedApiKey, "api")}
                          className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Copier la clé API"
                        >
                          {copiedField === "api" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                  {/* P4 — message d'erreur explicite si le reveal échoue */}
                  {revealError && (
                    <p className="text-[0.65rem] text-destructive mt-0.5">{revealError}</p>
                  )}
                </div>
              </div>
            )}
            {type === "WOOCOMMERCE" && existingIntegration && (
              <div className="space-y-2">
                {/* Clé consommateur */}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Clé consommateur :</p>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-[0.65rem] bg-muted px-2 py-1 rounded break-all select-all font-mono">
                      {revealedWooKey && showWooKey ? revealedWooKey : "•".repeat(24)}
                    </code>
                    {!revealedWooKey ? (
                      <button
                        type="button"
                        onClick={handleRevealWooKey}
                        disabled={revealing}
                        className="shrink-0 px-2 py-1 text-[0.65rem] rounded border border-input bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        aria-label="Révéler la clé consommateur"
                      >
                        {revealing ? "…" : "Révéler"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowWooKey((v) => !v)}
                          className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showWooKey ? "Masquer la clé" : "Afficher la clé"}
                        >
                          {showWooKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(revealedWooKey, "woo")}
                          className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Copier la clé consommateur"
                        >
                          {copiedField === "woo" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                  {revealError && type === "WOOCOMMERCE" && (
                    <p className="text-[0.65rem] text-destructive mt-0.5">{revealError}</p>
                  )}
                </div>

                {/* Dernier webhook reçu — rec 3 Sophie */}
                {existingIntegration.lastSyncAt && (
                  <div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      Dernier webhook reçu :{" "}
                      {syncDateFmt.format(new Date(existingIntegration.lastSyncAt))}
                    </span>
                  </div>
                )}

                {/* Régénérer le secret webhook — rec 2 Sophie */}
                <button
                  type="button"
                  onClick={handleRegenerateWooSecret}
                  disabled={regeneratingWoo}
                  className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3 w-3 shrink-0", regeneratingWoo && "animate-spin")} />
                  {regeneratingWoo ? "Génération…" : "Régénérer le secret webhook"}
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-destructive hover:text-destructive"
            >
              {disconnecting ? "Déconnexion..." : "Déconnecter"}
            </Button>
          </div>
        )}

        {/* Erreur de connexion */}
        {!comingSoon && isError && existingIntegration?.lastError && (
          <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {existingIntegration.lastError}
          </div>
        )}

        {/* Bouton "Connecter" si non connecté et formulaire fermé */}
        {!comingSoon && showForm && !formOpen && !disabled && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            Connecter {meta.label}
          </Button>
        )}

        {/* Erreur d'action */}
        {actionError && (
          <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {actionError}
          </div>
        )}

        {/* Guides de configuration — toujours visibles */}
        {type === "SHOPIFY" && !comingSoon && (
          <ShopifySetupDrawer tenantId={tenantId} />
        )}
        {type === "CRISP" && !comingSoon && (
          <CrispSetupDrawer />
        )}
        {type === "WOOCOMMERCE" && wooDrawerIntegrationId && (
          <WooCommerceWebhookDrawer
            open={wooDrawerOpen}
            onClose={() => setWooDrawerOpen(false)}
            integrationId={wooDrawerIntegrationId}
            webhookSecret={wooDrawerSecret}
          />
        )}

        {/* Formulaire de connexion */}
        {!comingSoon && formOpen && !disabled && (
          <form onSubmit={submitting ? undefined : handleConnect}>
            <fieldset disabled={submitting} className="space-y-0">
              {type === "GORGIAS" && (
                <GorgiasOAuthForm onCancel={() => setFormOpen(false)} />
              )}
              {type === "SHOPIFY" && (
                <ShopifyOAuthForm onCancel={() => setFormOpen(false)} />
              )}
              {type === "PRESTASHOP" && (
                <PrestaShopForm onCancel={() => setFormOpen(false)} />
              )}
              {type === "WOOCOMMERCE" && (
                <WooCommerceForm onCancel={() => setFormOpen(false)} />
              )}
              {type === "CRISP" && (
                <CrispForm onCancel={() => setFormOpen(false)} />
              )}
              {submitting && (
                <p className="text-xs text-muted-foreground pt-2">
                  Test de connexion en cours...
                </p>
              )}
            </fieldset>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
