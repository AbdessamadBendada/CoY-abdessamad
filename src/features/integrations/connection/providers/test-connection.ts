const TIMEOUT_MS = 8_000;

function withTimeout(promise: Promise<Response>): Promise<Response> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai dépassé (8s)")), TIMEOUT_MS)
    ),
  ]);
}

export type TestConnectionResult = {
  ok: boolean;
  shopName?: string;
  error?: string;
};

// ─── GORGIAS ──────────────────────────────────────────────────────────────────
// GET https://{subdomain}.gorgias.com/api/account
// Auth : Bearer token (OAuth 2.0)
export async function testGorgias(
  subdomain:   string,
  accessToken: string
): Promise<TestConnectionResult> {
  try {
    const res = await withTimeout(
      fetch(`https://${subdomain}.gorgias.com/api/account`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      })
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Token d'accès invalide ou expiré. Reconnectez Gorgias." };
    }
    if (!res.ok) {
      return { ok: false, error: `Erreur Gorgias (${res.status}). Vérifiez le sous-domaine.` };
    }

    const data = await res.json();
    return { ok: true, shopName: data?.name ?? subdomain };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return { ok: false, error: `Impossible de contacter Gorgias : ${message}` };
  }
}

// ─── SHOPIFY ──────────────────────────────────────────────────────────────────
// GET https://{shop_domain}/admin/api/2026-01/shop.json
// Auth : X-Shopify-Access-Token header
export async function testShopify(
  shopDomain: string,
  accessToken: string
): Promise<TestConnectionResult> {
  // Normalise le domaine (retire https:// si l'utilisateur l'a saisi)
  const domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    const res = await withTimeout(
      fetch(`https://${domain}/admin/api/2026-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": accessToken },
        cache: "no-store",
      })
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Token d'accès invalide ou permissions insuffisantes." };
    }
    if (res.status === 404) {
      return { ok: false, error: "Boutique introuvable. Vérifiez le domaine (ex: maboutique.myshopify.com)." };
    }
    if (!res.ok) {
      return { ok: false, error: `Erreur Shopify (${res.status}).` };
    }

    const data = await res.json();
    return { ok: true, shopName: data?.shop?.name ?? domain };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return { ok: false, error: `Impossible de contacter Shopify : ${message}` };
  }
}

// ─── PRESTASHOP ───────────────────────────────────────────────────────────────
// GET https://{shop_domain}/api/?output_format=JSON
// Auth : HTTP Basic — apiKey: (clé comme username, mot de passe vide)
export async function testPrestaShop(
  shopDomain: string,
  apiKey: string
): Promise<TestConnectionResult> {
  // Normalise l'URL (ajoute https:// si absent, retire le slash final)
  let baseUrl = shopDomain.trim();
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  try { baseUrl = (await validateOutboundHttpsUrl(baseUrl)).toString().replace(/\/$/, ""); }
  catch { return { ok: false, error: "URL boutique invalide ou non publique." }; }

  try {
    const credentials = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await withTimeout(
      fetch(`${baseUrl}/api/?output_format=JSON`, {
        headers: { Authorization: `Basic ${credentials}` },
        cache: "no-store",
      })
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Clé API invalide ou accès refusé. Vérifiez les permissions API PrestaShop." };
    }
    if (res.status === 404) {
      return { ok: false, error: "API PrestaShop introuvable. Vérifiez que l'API est activée et l'URL correcte." };
    }
    if (!res.ok) {
      return { ok: false, error: `Erreur PrestaShop (${res.status}).` };
    }

    // L'API PrestaShop retourne la liste des ressources disponibles
    const data = await res.json();
    const shopName = data?.api?.shop?.name ?? new URL(baseUrl).hostname;
    return { ok: true, shopName };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return { ok: false, error: `Impossible de contacter PrestaShop : ${message}` };
  }
}

// ─── WOOCOMMERCE ──────────────────────────────────────────────────────────────
// GET {siteUrl}/wp-json/wc/v3/orders?per_page=1
// Auth : Basic base64(consumerKey:consumerSecret)
export async function testWooCommerce(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<TestConnectionResult> {
  let baseUrl = siteUrl.trim();
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  try { baseUrl = (await validateOutboundHttpsUrl(baseUrl)).toString().replace(/\/$/, ""); }
  catch { return { ok: false, error: "URL boutique invalide ou non publique." }; }

  try {
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const res = await withTimeout(
      fetch(`${baseUrl}/wp-json/wc/v3/orders?per_page=1`, {
        headers: { Authorization: `Basic ${credentials}` },
        cache: "no-store",
      })
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Clé API invalide ou permissions insuffisantes. Vérifiez la clé consommateur WooCommerce." };
    }
    if (res.status === 404) {
      return { ok: false, error: "API WooCommerce introuvable. Vérifiez que WooCommerce est installé et l'URL correcte." };
    }
    if (!res.ok) {
      return { ok: false, error: `Erreur WooCommerce (${res.status}).` };
    }

    const hostname = new URL(baseUrl).hostname;
    return { ok: true, shopName: hostname };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return { ok: false, error: `Impossible de contacter WooCommerce : ${message}` };
  }
}

// ─── CRISP ────────────────────────────────────────────────────────────────────
// GET https://api.crisp.chat/v1/website/{websiteId}
// Auth : Basic base64(CRISP_PLUGIN_IDENTIFIER:CRISP_PLUGIN_KEY) + X-Crisp-Tier: plugin
export async function testCrisp(websiteId: string): Promise<TestConnectionResult> {
  try {
    const identifier = process.env.CRISP_PLUGIN_IDENTIFIER;
    const key = process.env.CRISP_PLUGIN_KEY;
    if (!identifier || !key) {
      return { ok: false, error: "Configuration plugin Crisp manquante côté serveur." };
    }
    const credentials = Buffer.from(`${identifier}:${key}`).toString("base64");
    const res = await withTimeout(
      fetch(`https://api.crisp.chat/v1/website/${websiteId.trim()}`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Crisp-Tier": "plugin",
        },
        cache: "no-store",
      })
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Accès refusé. Vérifiez que votre Website ID est correct et que votre compte Crisp est actif." };
    }
    if (res.status === 404) {
      return { ok: false, error: "Website Crisp introuvable. Vérifiez l'identifiant du website." };
    }
    if (!res.ok) {
      return { ok: false, error: `Erreur Crisp (${res.status}).` };
    }

    const data = await res.json() as { data?: { domain?: string } };
    const shopName = data?.data?.domain ?? websiteId;
    return { ok: true, shopName };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return { ok: false, error: `Impossible de contacter Crisp : ${message}` };
  }
}
import { validateOutboundHttpsUrl } from "@/shared/security/outbound-url";
