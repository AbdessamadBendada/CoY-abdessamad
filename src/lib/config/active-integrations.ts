export const ACTIVE_INTEGRATIONS = ["SHOPIFY", "GORGIAS", "PRESTASHOP"] as const;
export const DEFERRED_INTEGRATIONS = ["WOOCOMMERCE", "CRISP", "ZENDESK", "FRESHDESK"] as const;

export type ActiveIntegrationType = (typeof ACTIVE_INTEGRATIONS)[number];

export function isIntegrationActive(type: string): boolean {
  return (ACTIVE_INTEGRATIONS as readonly string[]).includes(type);
}
