# Intégration : PrestaShop

> **Statut** : ✅ Validé
> **Priorité** : P1 (V1 Beta M5-M6)
> **Version** : 1.0
> **Dernière MAJ** : 2026-02-26
> **Dépend de** : `architecture-globale.md`, `detection-insatisfaction.md`, `scoring-churn.md`, `generation-messages.md`, `modele-donnees.md`
> **Effort estimé** : 12-16h de développement

---

## 1. Objectif

PrestaShop est le **2ème connecteur e-commerce** de WinBack Agent, ciblant les PME françaises qui n'utilisent pas Shopify. PrestaShop représente ~25% du marché e-commerce français en open-source et est surreprésenté chez les PME à 500k€-2M€ de CA (cœur de cible WinBack).

**Différence clé avec Shopify :** PrestaShop n'a pas de système de webhooks natif robuste. L'intégration V1 utilise le **polling** (appels API planifiés) au lieu des webhooks temps réel. La V2 introduira un module PrestaShop custom pour les webhooks.

PrestaShop remplit les **3 mêmes rôles** que Shopify :
1. **Source de signaux** : Annulations, remboursements, retours, messages clients
2. **Source d'enrichissement** : LTV, commandes, panier moyen
3. **Source de conversion** : Nouvelles commandes post-action → attribution ROI

---

## 2. User Stories

| ID | En tant que... | Je veux... | Afin de... | Priorité |
|----|---------------|-----------|-----------|----------|
| PS-01 | Tenant | Connecter ma boutique PrestaShop en renseignant l'URL et la clé API | Activer la détection sans compétence technique avancée | P1 |
| PS-02 | Système | Détecter les commandes annulées toutes les 5 minutes | Réagir aux signaux de churn avec un délai acceptable | P1 |
| PS-03 | Système | Détecter les retours produits | Identifier les insatisfactions liées aux produits | P1 |
| PS-04 | Système | Récupérer les messages du formulaire de contact | Analyser le contenu textuel de l'insatisfaction | P1 |
| PS-05 | Système | Synchroniser les données client (LTV, commandes) | Calculer le score de churn avec des données fiables | P1 |
| PS-06 | Système | Détecter les nouvelles commandes pour l'attribution | Mesurer le ROI des actions de récupération | P1 |
| PS-07 | Système | Créer des règles de panier (cart rules) via l'API | Générer automatiquement les codes promo | P2 |
| PS-08 | Tenant | Voir le statut de synchronisation et le délai de polling | Comprendre la latence du système | P2 |
| PS-09 | Tenant | Déconnecter PrestaShop proprement | Révoquer l'accès API | P2 |

---

## 3. Architecture de l'Intégration

```mermaid
graph LR
    subgraph "PrestaShop"
        PS_API[Webservice API<br/>REST XML/JSON]
        PS_ORDERS[/api/orders]
        PS_RETURNS[/api/order_returns]
        PS_MSGS[/api/customer_messages]
        PS_CUST[/api/customers]
        PS_CART[/api/cart_rules]
    end

    subgraph "WinBack — n8n (Polling)"
        CRON5[Cron 5min<br/>Signaux]
        CRON6H[Cron 6h<br/>Sync clients]
        CRON_ATTR[Cron 15min<br/>Attribution]

        FETCH[Fetch API<br/>depuis last_sync_at]
        DEDUP[Déduplication<br/>événements déjà vus]
        NORM[Normalisation<br/>→ NormalizedEvent]
        PIPE[→ Pipeline<br/>de Détection]
    end

    subgraph "WinBack — Compensation"
        PROMO[PrestaShop API<br/>POST /api/cart_rules]
    end

    PS_API --> PS_ORDERS & PS_RETURNS & PS_MSGS & PS_CUST

    CRON5 -->|Toutes les 5min| FETCH
    FETCH -->|GET orders, returns, messages| PS_API
    FETCH --> DEDUP --> NORM --> PIPE

    CRON6H -->|Toutes les 6h| PS_CUST
    CRON_ATTR -->|Toutes les 15min| PS_ORDERS

    PIPE -->|Compensation| PROMO --> PS_CART
```

---

## 4. Authentification PrestaShop

### 4.1 Méthode : Webservice API Key

PrestaShop utilise une **clé API unique** avec authentification HTTP Basic (la clé est le username, le password est vide).

| Élément | Valeur | Stockage |
|---------|--------|----------|
| Base URL | `https://{domain}/api` | `integrations.shop_domain` |
| API Key | Clé webservice PrestaShop | `integrations.api_key_encrypted` (AES-256) |
| API Format | JSON (`output_format=JSON`) | Hardcoded |
| API Version | Non versionné (varie par installation) | Détecté au test de connexion |

### 4.2 Guide de Connexion (Tenant)

> 📸 Pour les captures d'écran et l'arborescence exacte des menus PrestaShop 1.7.x / 8.x / 9.x 2025-2026, voir [`02-integrations/interfaces-reference-2026.md`](./interfaces-reference-2026.md).

```
ÉTAPE 1 — Activer le Webservice PrestaShop
  1. Back-office PrestaShop → Paramètres avancés → Webservice
  2. Activez le webservice (si désactivé)
  3. Cliquez "Ajouter une nouvelle clé de webservice"
  4. Renseignez :
     - Description : "WinBack Agent"
     - Statut : Actif
  5. Permissions (cochez) :
     ☑ orders           → GET (commandes — obligatoire)
     ☑ order_returns    → GET (retours — obligatoire)
     ☑ customers        → GET (clients — obligatoire)
     ☑ customer_messages → GET (messages SAV — obligatoire)
     ☑ order_states     → GET (labels états custom — obligatoire, tous plans)
     ☑ order_histories  → GET (transitions d'états — obligatoire, tous plans)
     ☑ order_details    → GET (lignes de commande — obligatoire, tous plans)
     ☑ products         → GET (catalogue produit — tout tenant CoY)
     ☑ cart_rules       → GET + POST + PUT (codes promo automatiques — si activé)
  6. Cliquez "Enregistrer"
  7. Copiez la clé API générée

ÉTAPE 2 — Configurer dans WinBack
  1. Dashboard WinBack → Configuration → Intégrations
  2. Cliquez "Connecter PrestaShop"
  3. Renseignez :
     - URL de votre boutique : ex. "https://www.maboutique.fr"
     - Clé API webservice
  4. Cliquez "Tester la connexion"
  5. Si OK → WinBack lance la synchronisation initiale
```

### 4.3 Test de Connexion

```typescript
async function testPrestaShopConnection(
  shopUrl: string,
  apiKey: string
): Promise<{ success: boolean; error?: string; shopInfo?: PrestaShopInfo }> {
  try {
    // Nettoyer l'URL
    const baseUrl = normalizePrestaShopUrl(shopUrl);

    // Test 1 : vérifier que l'API est accessible
    const response = await fetch(`${baseUrl}/api?output_format=JSON`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      },
    });

    if (response.status === 401) {
      return { success: false, error: 'Clé API invalide. Vérifiez la clé webservice dans votre back-office PrestaShop.' };
    }
    if (response.status === 403) {
      return { success: false, error: 'Accès refusé. Vérifiez que le webservice est activé dans Paramètres avancés → Webservice.' };
    }
    if (response.status === 404) {
      return { success: false, error: 'API PrestaShop non trouvée. Vérifiez que l\'URL de votre boutique est correcte et que /api est accessible.' };
    }
    if (!response.ok) {
      return { success: false, error: `Erreur PrestaShop (${response.status}): ${response.statusText}` };
    }

    const apiRoot = await response.json();

    // Test 2 : vérifier les permissions requises
    const requiredResources = ['orders', 'customers', 'order_returns', 'customer_messages'];
    const availableResources = Object.keys(apiRoot.api || {});
    const missingResources = requiredResources.filter(r => !availableResources.includes(r));

    if (missingResources.length > 0) {
      return {
        success: false,
        error: `Permissions manquantes sur la clé API : ${missingResources.join(', ')}. Ajoutez les permissions GET pour ces ressources.`,
      };
    }

    // Test 3 : récupérer les infos de la boutique
    const shopResponse = await fetch(
      `${baseUrl}/api/shops?output_format=JSON`,
      { headers: { 'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` } }
    );
    const shopData = shopResponse.ok ? await shopResponse.json() : null;

    // Test 4 : vérifier la version PrestaShop
    const version = await detectPrestaShopVersion(baseUrl, apiKey);

    return {
      success: true,
      shopInfo: {
        name: shopData?.shops?.[0]?.name || 'Boutique PrestaShop',
        domain: new URL(baseUrl).hostname,
        version,
        availableResources,
      },
    };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Impossible de contacter le serveur. Vérifiez l\'URL de votre boutique.' };
    }
    return { success: false, error: `Erreur inattendue : ${error.message}` };
  }
}

function normalizePrestaShopUrl(url: string): string {
  // Nettoyer : supprimer le trailing slash, /api, /index.php
  let clean = url.trim().replace(/\/+$/, '');
  clean = clean.replace(/\/api\/?$/, '');
  clean = clean.replace(/\/index\.php\/?$/, '');
  // Ajouter https:// si absent
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean;
}
```

---

## 5. Polling : Stratégie de Synchronisation

### 5.1 Pourquoi le Polling

| Critère | Webhooks (Shopify) | Polling (PrestaShop) |
|---------|-------------------|---------------------|
| Latence | Temps réel (~1s) | 5 minutes (cron) |
| Fiabilité | Peut manquer un event (réseau) | Garanti (rattrapage natif) |
| Setup tenant | Automatique | Automatique (pas de config côté PrestaShop) |
| Charge serveur | Faible (push) | Modérée (pull toutes les 5min) |
| Complexité | Validation HMAC | Gestion du curseur `last_sync_at` |

PrestaShop n'a pas de système de webhooks natif fiable. Les modules tiers (webhooks PrestaShop) sont instables et varient selon les versions. Le polling est l'approche la plus robuste en V1.

### 5.2 Architecture des Crons

| Cron | Fréquence | Rôle | Endpoints appelés |
|------|-----------|------|-------------------|
| `prestashop-signals` | Toutes les 5 min | Détecter annulations, retours, messages | `/api/orders`, `/api/order_returns`, `/api/customer_messages` |
| `prestashop-sync` | Toutes les 6h | Synchroniser les données clients | `/api/customers` |
| `prestashop-attribution` | Toutes les 15 min | Détecter nouvelles commandes (conversion) | `/api/orders` |

### 5.3 Mécanisme du Curseur

```typescript
interface PollingState {
  tenantId: string;
  integrationId: string;
  lastSyncAt: Date;        // Curseur principal : dernière sync réussie
  lastOrderId: number;      // Dernier order ID traité (backup)
  lastReturnId: number;     // Dernier return ID traité
  lastMessageId: number;    // Dernier message ID traité
  syncInProgress: boolean;  // Verrou anti-concurrence
  consecutiveErrors: number;
}

async function pollPrestaShopSignals(
  tenant: Tenant,
  integration: Integration
): Promise<PollingResult> {
  const state = await getPollingState(tenant.id, integration.id);

  // Verrou : éviter les exécutions concurrentes
  if (state.syncInProgress) {
    logger.info(`Polling already in progress for tenant ${tenant.id}, skipping`);
    return { skipped: true };
  }

  await setPollingLock(tenant.id, integration.id, true);

  try {
    const apiClient = createPrestaShopClient(integration);
    const since = state.lastSyncAt;
    const events: NormalizedEvent[] = [];

    // 1. Récupérer les commandes modifiées depuis last_sync_at
    const orderEvents = await pollOrders(apiClient, tenant.id, since);
    events.push(...orderEvents);

    // 2. Récupérer les retours créés depuis last_sync_at
    const returnEvents = await pollReturns(apiClient, tenant.id, since);
    events.push(...returnEvents);

    // 3. Récupérer les messages clients depuis last_sync_at
    const messageEvents = await pollCustomerMessages(apiClient, tenant.id, since);
    events.push(...messageEvents);

    // 4. Dédupliquer (un événement peut avoir été vu au cycle précédent)
    const deduplicatedEvents = await deduplicateEvents(tenant.id, events);

    // 5. Injecter chaque événement dans le pipeline
    for (const event of deduplicatedEvents) {
      await injectIntoPipeline(event);
    }

    // 6. Mettre à jour le curseur SEULEMENT si tout s'est bien passé
    await updatePollingState(tenant.id, integration.id, {
      lastSyncAt: new Date(),
      consecutiveErrors: 0,
    });

    return { processed: deduplicatedEvents.length, total: events.length };

  } catch (error) {
    const newErrorCount = state.consecutiveErrors + 1;
    await updatePollingState(tenant.id, integration.id, {
      consecutiveErrors: newErrorCount,
    });

    // Après 5 erreurs consécutives → alerte
    if (newErrorCount >= 5) {
      await alertIntegrationError(tenant.id, 'PRESTASHOP', error.message);
    }

    throw error;
  } finally {
    await setPollingLock(tenant.id, integration.id, false);
  }
}
```

### 5.4 Déduplication

Comme le polling peut retraiter des événements déjà vus (fenêtre de chevauchement), WinBack maintient un registre des événements récents :

```typescript
async function deduplicateEvents(
  tenantId: string,
  events: NormalizedEvent[]
): Promise<NormalizedEvent[]> {
  // Vérifier chaque eventId dans un cache TTL 2h
  const deduplicated: NormalizedEvent[] = [];

  for (const event of events) {
    const cacheKey = `ps-event-${tenantId}-${event.eventId}`;
    const alreadySeen = await cache.get(cacheKey);

    if (!alreadySeen) {
      await cache.set(cacheKey, '1', { ttl: 7200 }); // 2h TTL
      deduplicated.push(event);
    }
  }

  return deduplicated;
}
```

---

## 6. Mapping des États de Commande PrestaShop

### 6.1 Order States Standard

PrestaShop utilise des `order_states` numériques. Les IDs par défaut (installation standard) :

| ID | Nom (FR) | Nom (EN) | Signal WinBack |
|----|---------|---------|----------------|
| 1 | En attente de paiement | Awaiting check payment | — |
| 2 | Paiement accepté | Payment accepted | — |
| 3 | En cours de préparation | Processing in progress | — |
| 4 | Expédié | Shipped | — |
| 5 | Livré | Delivered | — |
| 6 | **Annulé** | **Cancelled** | ✅ `ORDER_CANCELLED` |
| 7 | **Remboursé** | **Refunded** | ✅ `ORDER_REFUNDED` |
| 8 | Erreur de paiement | Payment error | — (pas la faute du client) |
| 9 | En attente virement | On backorder (paid) | — |
| 10 | En attente réapprovisionnement | Awaiting bank wire payment | — |
| 11 | Paiement à distance accepté | Remote payment accepted | — |
| 12 | En attente paiement PayPal | Awaiting PayPal payment | — |

**Problème :** Les IDs peuvent varier selon l'installation (thèmes, modules, configuration custom). WinBack doit mapper par **nom** en plus de l'ID.

### 6.2 Détection Dynamique des States

```typescript
async function detectOrderStates(
  apiClient: PrestaShopApiClient
): Promise<OrderStateMapping> {
  const response = await apiClient.get('/api/order_states?output_format=JSON&display=full');
  const states = response.order_states;

  const mapping: OrderStateMapping = {
    cancelledIds: [],
    refundedIds: [],
    deliveredIds: [],
  };

  for (const state of states) {
    const nameLower = (state.name?.[0]?.value || '').toLowerCase();

    // Matcher par nom (multi-langue, priorité au français)
    if (
      nameLower.includes('annul') ||
      nameLower.includes('cancel')
    ) {
      mapping.cancelledIds.push(state.id);
    }

    if (
      nameLower.includes('rembours') ||
      nameLower.includes('refund')
    ) {
      mapping.refundedIds.push(state.id);
    }

    if (
      nameLower.includes('livr') ||
      nameLower.includes('deliver')
    ) {
      mapping.deliveredIds.push(state.id);
    }
  }

  // Fallback sur les IDs par défaut si aucun match
  if (mapping.cancelledIds.length === 0) mapping.cancelledIds = [6];
  if (mapping.refundedIds.length === 0) mapping.refundedIds = [7];
  if (mapping.deliveredIds.length === 0) mapping.deliveredIds = [5];

  return mapping;
}
```

**Stockage :** Le mapping est calculé à la connexion et stocké dans `integrations.config.orderStateMapping`. Recalculé à chaque sync complète (toutes les 24h).

---

## 7. Événements et Payloads

### 7.1 Polling des Commandes Annulées/Remboursées

```
GET /api/orders?output_format=JSON
  &display=full
  &filter[date_upd]=[{last_sync_at},]
  &filter[current_state]=[6|7]
  &sort=[date_upd_DESC]
  &limit=100
```

**Payload PrestaShop (champs clés) :**

```json
{
  "orders": [
    {
      "id": 4567,
      "reference": "ABCDEFGHI",
      "id_customer": "1234",
      "id_address_delivery": "567",
      "current_state": "6",
      "payment": "Stripe",
      "total_paid": "89.90",
      "total_paid_tax_incl": "89.90",
      "total_paid_tax_excl": "74.92",
      "total_products": "79.90",
      "total_shipping": "10.00",
      "date_add": "2026-02-20T12:00:00",
      "date_upd": "2026-02-23T15:30:00",
      "associations": {
        "order_rows": [
          {
            "id": "8901",
            "product_id": "42",
            "product_name": "T-shirt Premium Coton Bio - Taille M, Bleu",
            "product_quantity": "2",
            "unit_price_tax_incl": "34.95"
          },
          {
            "id": "8902",
            "product_id": "55",
            "product_name": "Ceinture Cuir Artisanale - Noir",
            "product_quantity": "1",
            "unit_price_tax_incl": "10.00"
          }
        ]
      }
    }
  ]
}
```

**Normalisation :**

```typescript
async function pollOrders(
  apiClient: PrestaShopApiClient,
  tenantId: string,
  since: Date
): Promise<NormalizedEvent[]> {
  const stateMapping = await getOrderStateMapping(tenantId);
  const targetStates = [...stateMapping.cancelledIds, ...stateMapping.refundedIds];

  // Récupérer les commandes modifiées depuis le dernier poll
  const sinceStr = formatPrestaShopDate(since);
  const url = `/api/orders?output_format=JSON&display=full`
    + `&filter[date_upd]=[${sinceStr},]`
    + `&filter[current_state]=[${targetStates.join('|')}]`
    + `&sort=[date_upd_DESC]&limit=100`;

  const response = await apiClient.get(url);
  const orders = response.orders || [];
  const events: NormalizedEvent[] = [];

  for (const order of orders) {
    // Récupérer les infos client
    const customer = await getPrestaShopCustomer(apiClient, order.id_customer);
    if (!customer) continue;

    const isCancelled = stateMapping.cancelledIds.includes(parseInt(order.current_state));
    const isRefunded = stateMapping.refundedIds.includes(parseInt(order.current_state));

    const items = (order.associations?.order_rows || []).map(
      (row: any) => `${row.product_name} ×${row.product_quantity}`
    ).join(', ');

    const syntheticBody = [
      `Commande #${order.reference} ${isCancelled ? 'annulée' : 'remboursée'}.`,
      `Articles : ${items}.`,
      `Montant : ${order.total_paid}€.`,
    ].join(' ');

    events.push({
      eventId: `ps-order-${order.id}-${order.current_state}`,
      tenantId,
      platform: 'PRESTASHOP',
      eventType: isCancelled ? 'ORDER_CANCELLED' : 'ORDER_REFUNDED',
      customer: {
        externalId: String(order.id_customer),
        email: customer.email,
        firstName: customer.firstname,
        lastName: customer.lastname,
      },
      content: {
        subject: `${isCancelled ? 'Annulation' : 'Remboursement'} commande #${order.reference}`,
        body: syntheticBody,
        language: 'fr',
      },
      context: {
        orderValue: parseFloat(order.total_paid),
        isRepeatIssue: false,
      },
      metadata: {
        prestashopOrderId: order.id,
        prestashopReference: order.reference,
        orderState: order.current_state,
        itemCount: order.associations?.order_rows?.length || 0,
      },
      receivedAt: new Date(),
      rawPayload: order,
    });
  }

  return events;
}
```

---

### 7.2 Polling des Retours Produits

```
GET /api/order_returns?output_format=JSON
  &display=full
  &filter[date_add]=[{last_sync_at},]
  &filter[state]=[1|2]
  &sort=[date_add_DESC]
  &limit=50
```

**States de retour :** `1` = En attente de confirmation, `2` = En attente du colis

```typescript
async function pollReturns(
  apiClient: PrestaShopApiClient,
  tenantId: string,
  since: Date
): Promise<NormalizedEvent[]> {
  const sinceStr = formatPrestaShopDate(since);
  const url = `/api/order_returns?output_format=JSON&display=full`
    + `&filter[date_add]=[${sinceStr},]`
    + `&sort=[date_add_DESC]&limit=50`;

  const response = await apiClient.get(url);
  const returns = response.order_returns || [];
  const events: NormalizedEvent[] = [];

  for (const ret of returns) {
    // Récupérer la commande associée pour avoir les détails
    const order = await getPrestaShopOrder(apiClient, ret.id_order);
    const customer = await getPrestaShopCustomer(apiClient, ret.id_customer);
    if (!customer || !order) continue;

    const syntheticBody = [
      `Retour demandé sur la commande #${order.reference}.`,
      ret.question ? `Raison : "${ret.question}".` : '',
      `Montant commande : ${order.total_paid}€.`,
    ].filter(Boolean).join(' ');

    events.push({
      eventId: `ps-return-${ret.id}`,
      tenantId,
      platform: 'PRESTASHOP',
      eventType: 'RETURN_CREATED',
      customer: {
        externalId: String(ret.id_customer),
        email: customer.email,
        firstName: customer.firstname,
        lastName: customer.lastname,
      },
      content: {
        subject: `Retour produit — Commande #${order.reference}`,
        body: syntheticBody,
        language: 'fr',
      },
      context: {
        orderValue: parseFloat(order.total_paid),
        isRepeatIssue: false,
      },
      metadata: {
        prestashopReturnId: ret.id,
        prestashopOrderId: ret.id_order,
        prestashopReference: order.reference,
        returnReason: ret.question,
        returnState: ret.state,
      },
      receivedAt: new Date(),
      rawPayload: ret,
    });
  }

  return events;
}
```

---

### 7.3 Polling des Messages Clients

PrestaShop a un formulaire de contact intégré qui stocke les messages dans `customer_messages` (lié à `customer_threads`).

```
GET /api/customer_messages?output_format=JSON
  &display=full
  &filter[date_add]=[{last_sync_at},]
  &sort=[date_add_DESC]
  &limit=50
```

```typescript
async function pollCustomerMessages(
  apiClient: PrestaShopApiClient,
  tenantId: string,
  since: Date
): Promise<NormalizedEvent[]> {
  const sinceStr = formatPrestaShopDate(since);
  const url = `/api/customer_messages?output_format=JSON&display=full`
    + `&filter[date_add]=[${sinceStr},]`
    + `&sort=[date_add_DESC]&limit=50`;

  const response = await apiClient.get(url);
  const messages = response.customer_messages || [];
  const events: NormalizedEvent[] = [];

  for (const msg of messages) {
    // Ignorer les messages d'employés (agents)
    if (parseInt(msg.id_employee) > 0) continue;

    // Ignorer les messages sans client identifié
    if (!msg.id_customer || parseInt(msg.id_customer) === 0) continue;

    const customer = await getPrestaShopCustomer(apiClient, msg.id_customer);
    if (!customer) continue;

    // Récupérer le thread pour le sujet
    let subject = 'Message client';
    if (msg.id_customer_thread) {
      const thread = await getPrestaShopCustomerThread(apiClient, msg.id_customer_thread);
      if (thread) {
        subject = `Contact : ${thread.token || 'Message'}`;
      }
    }

    events.push({
      eventId: `ps-msg-${msg.id}`,
      tenantId,
      platform: 'PRESTASHOP',
      eventType: 'NEW_TICKET',
      customer: {
        externalId: String(msg.id_customer),
        email: customer.email,
        firstName: customer.firstname,
        lastName: customer.lastname,
      },
      content: {
        subject,
        body: msg.message || '',
        language: 'fr',
      },
      context: {
        isRepeatIssue: false,
      },
      metadata: {
        prestashopMessageId: msg.id,
        prestashopThreadId: msg.id_customer_thread,
      },
      receivedAt: new Date(),
      rawPayload: msg,
    });
  }

  return events;
}
```

---

### 7.4 Polling pour l'Attribution (Conversions)

```typescript
async function pollConversions(
  tenant: Tenant,
  integration: Integration
): Promise<void> {
  const apiClient = createPrestaShopClient(integration);
  const stateMapping = await getOrderStateMapping(tenant.id);

  // Récupérer les commandes récentes (payées/livrées)
  const paidStates = [2, 3, 4, 5, ...stateMapping.deliveredIds]; // Payment accepted + shipped + delivered
  const since = subHours(new Date(), 1); // Dernière heure (avec marge)
  const sinceStr = formatPrestaShopDate(since);

  const url = `/api/orders?output_format=JSON&display=full`
    + `&filter[date_add]=[${sinceStr},]`
    + `&filter[current_state]=[${paidStates.join('|')}]`
    + `&sort=[date_add_DESC]&limit=50`;

  const response = await apiClient.get(url);
  const orders = response.orders || [];

  for (const order of orders) {
    const customer = await db.customers.findFirst({
      where: {
        tenantId: tenant.id,
        externalId: String(order.id_customer),
        platformSource: 'PRESTASHOP',
      },
    });

    if (!customer) continue;

    // Chercher des actions de récupération en cours
    const pendingActions = await db.recoveryActions.findMany({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
      },
      orderBy: { sentAt: 'desc' },
    });

    if (pendingActions.length === 0) continue;

    for (const action of pendingActions) {
      const orderDate = new Date(order.date_add);
      const daysSinceAction = differenceInDays(orderDate, action.sentAt);

      if (daysSinceAction >= 0 && daysSinceAction <= action.attributionWindowDays) {
        // Vérifier si un code WinBack a été utilisé
        const usedWinbackCode = await checkWinbackCartRule(apiClient, order.id);

        const orderAmount = parseFloat(order.total_paid);
        const multiplier = getTenantMultiplier(tenant.id);
        const revenueRecovered = Math.round(orderAmount * multiplier * 100) / 100;

        await db.recoveryActions.update({
          where: { id: action.id },
          data: {
            status: 'CONVERTED',
            convertedAt: orderDate,
            revenueRecovered,
          },
        });

        await db.customers.update({
          where: { id: customer.id },
          data: {
            isRecovered: true,
            recoveryCount: { increment: 1 },
            churnScoreCurrent: 0,
            lastOrderAt: orderDate,
          },
        });

        logger.info(`PS Attribution: action ${action.id} → order #${order.reference} → ${revenueRecovered}€`);
        break; // Attribuer à la première action uniquement
      }
    }
  }
}
```

---

## 8. Enrichissement Client

### 8.1 Profil Client

```
GET /api/customers/{id}?output_format=JSON&display=full
```

```json
{
  "customer": {
    "id": "1234",
    "id_lang": "1",
    "firstname": "Marie",
    "lastname": "Dupont",
    "email": "marie.dupont@email.com",
    "birthday": "1990-05-15",
    "newsletter": "1",
    "optin": "1",
    "active": "1",
    "date_add": "2024-06-15 10:00:00",
    "date_upd": "2026-02-23 15:30:00"
  }
}
```

### 8.2 Historique des Commandes

```
GET /api/orders?output_format=JSON
  &display=full
  &filter[id_customer]={customer_id}
  &sort=[date_add_DESC]
  &limit=50
```

### 8.3 Calcul d'Enrichissement

```typescript
function enrichFromPrestaShop(
  customer: PrestaShopCustomer,
  orders: PrestaShopOrder[]
): CustomerEnrichment {
  // Filtrer les commandes payées (exclure annulées et erreurs)
  const paidOrders = orders.filter(
    o => ![6, 7, 8].includes(parseInt(o.current_state))
  );

  const totalOrders = paidOrders.length;
  const ltvCalculated = paidOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_paid), 0
  );
  const avgOrderValue = totalOrders > 0 ? ltvCalculated / totalOrders : 0;

  // Dates
  const firstOrderAt = paidOrders.length > 0
    ? new Date(paidOrders[paidOrders.length - 1].date_add)
    : new Date(customer.date_add);
  const lastOrderAt = paidOrders.length > 0
    ? new Date(paidOrders[0].date_add)
    : null;
  const daysSinceLastOrder = lastOrderAt
    ? differenceInDays(new Date(), lastOrderAt)
    : null;

  const customerAgeMonths = differenceInMonths(
    new Date(),
    new Date(customer.date_add)
  );

  // Fréquence
  const purchaseFrequency = totalOrders > 1 && lastOrderAt
    ? differenceInDays(lastOrderAt, firstOrderAt) / (totalOrders - 1)
    : null;

  // Taux de retour
  const cancelledOrders = orders.filter(o => parseInt(o.current_state) === 6).length;
  const refundedOrders = orders.filter(o => parseInt(o.current_state) === 7).length;
  const returnRate = orders.length > 0
    ? (cancelledOrders + refundedOrders) / orders.length
    : 0;

  return {
    ltvCalculated: Math.round(ltvCalculated * 100) / 100,
    totalOrders,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    firstOrderAt,
    lastOrderAt,
    daysSinceLastOrder,
    customerAgeMonths,
    purchaseFrequency: purchaseFrequency ? Math.round(purchaseFrequency) : null,
    returnRate: Math.round(returnRate * 100),
    newsletterOptIn: customer.newsletter === '1',
    tags: [], // PrestaShop n'a pas de tags natifs sur les clients
  };
}
```

---

## 9. Création Automatique de Codes Promo

### 9.1 PrestaShop Cart Rules

PrestaShop utilise les `cart_rules` (règles de panier) comme équivalent des discount codes.

```typescript
async function createPrestaShopCartRule(
  apiClient: PrestaShopApiClient,
  compensation: CompensationResult,
  customer: Customer,
  integration: Integration
): Promise<{ success: boolean; cartRuleId?: number; error?: string }> {

  const now = new Date();
  const expiresAt = addDays(now, compensation.validityDays);

  const cartRule: any = {
    cart_rule: {
      // Identité
      name: [{ id: '1', value: `WinBack - ${compensation.code}` }], // id=1 → FR
      code: compensation.code, // "WB-A7K2-E"
      description: 'Code de récupération généré par WinBack Agent',

      // Dates
      date_from: formatPrestaShopDate(now),
      date_to: formatPrestaShopDate(expiresAt),

      // Restrictions
      quantity: 1,                    // Usage total max
      quantity_per_user: 1,           // 1 usage par client
      id_customer: parseInt(customer.externalId), // Client spécifique

      // Priorité et combinaisons
      priority: 1,
      partial_use: '0',              // Pas d'utilisation partielle

      // Conditions
      active: '1',
      highlight: '0',                // Pas affiché publiquement
      free_shipping: compensation.type === 'free_shipping' ? '1' : '0',
    },
  };

  // Type de réduction
  if (compensation.type === 'discount_percent') {
    cartRule.cart_rule.reduction_percent = String(compensation.value);
    cartRule.cart_rule.reduction_tax = '1'; // Réduction TTC
  } else if (compensation.type === 'discount_fixed') {
    cartRule.cart_rule.reduction_amount = String(compensation.value);
    cartRule.cart_rule.reduction_tax = '1';
    cartRule.cart_rule.reduction_currency = '1'; // EUR (id=1 par défaut)
  }

  // Commande minimum
  if (compensation.minOrderValue > 0) {
    cartRule.cart_rule.minimum_amount = String(compensation.minOrderValue);
    cartRule.cart_rule.minimum_amount_tax = '1';
    cartRule.cart_rule.minimum_amount_currency = '1';
  }

  try {
    const response = await apiClient.post('/api/cart_rules', {
      output_format: 'JSON',
      body: JSON.stringify(cartRule),
    });

    if (response.cart_rule?.id) {
      return { success: true, cartRuleId: parseInt(response.cart_rule.id) };
    }

    return { success: false, error: 'Réponse inattendue de PrestaShop' };
  } catch (error) {
    return { success: false, error: `Création cart rule échouée: ${error.message}` };
  }
}
```

### 9.2 Vérification d'Utilisation du Code

```typescript
async function checkWinbackCartRule(
  apiClient: PrestaShopApiClient,
  orderId: number
): Promise<boolean> {
  // PrestaShop stocke les cart_rules utilisées dans order_cart_rules
  const url = `/api/order_cart_rules?output_format=JSON`
    + `&filter[id_order]=${orderId}`;

  const response = await apiClient.get(url);
  const cartRules = response.order_cart_rules || [];

  for (const rule of cartRules) {
    // Récupérer le détail de la cart_rule pour vérifier le code
    const ruleDetail = await apiClient.get(
      `/api/cart_rules/${rule.id_cart_rule}?output_format=JSON`
    );
    if (ruleDetail.cart_rule?.code?.startsWith('WB-')) {
      return true;
    }
  }

  return false;
}
```

---

## 10. Synchronisation des Clients

### 10.1 Sync Initiale

```typescript
async function syncInitialCustomersPrestaShop(
  tenant: Tenant,
  integration: Integration
): Promise<{ imported: number }> {
  const apiClient = createPrestaShopClient(integration);
  const maxCustomers = tenant.planConfig.customers_limit;
  let imported = 0;
  let offset = 0;
  const batchSize = 100;

  // PrestaShop ne donne pas total_spent directement sur /customers
  // Il faut calculer la LTV en récupérant les commandes

  while (imported < maxCustomers) {
    const url = `/api/customers?output_format=JSON&display=full`
      + `&filter[active]=1`
      + `&sort=[date_add_DESC]`
      + `&limit=${offset},${batchSize}`;

    const response = await apiClient.get(url);
    const customers = response.customers || [];

    if (customers.length === 0) break;

    for (const psCustomer of customers) {
      if (imported >= maxCustomers) break;
      if (!psCustomer.email) continue;

      // Récupérer les commandes pour calculer la LTV
      const ordersUrl = `/api/orders?output_format=JSON`
        + `&display=[id,total_paid,current_state,date_add]`
        + `&filter[id_customer]=${psCustomer.id}`
        + `&sort=[date_add_DESC]&limit=50`;

      const ordersResponse = await apiClient.get(ordersUrl);
      const orders = ordersResponse.orders || [];

      // Filtrer commandes payées
      const paidOrders = orders.filter(
        (o: any) => ![6, 7, 8].includes(parseInt(o.current_state))
      );

      // Ignorer les clients sans commande payée
      if (paidOrders.length === 0) continue;

      const ltvCalculated = paidOrders.reduce(
        (sum: number, o: any) => sum + parseFloat(o.total_paid), 0
      );

      await db.customers.upsert({
        where: {
          tenantId_externalId_platformSource: {
            tenantId: tenant.id,
            externalId: String(psCustomer.id),
            platformSource: 'PRESTASHOP',
          },
        },
        create: {
          tenantId: tenant.id,
          externalId: String(psCustomer.id),
          platformSource: 'PRESTASHOP',
          email: psCustomer.email,
          firstName: psCustomer.firstname,
          lastName: psCustomer.lastname,
          totalOrders: paidOrders.length,
          ltvCalculated: Math.round(ltvCalculated * 100) / 100,
          avgOrderValue: Math.round((ltvCalculated / paidOrders.length) * 100) / 100,
          firstOrderAt: paidOrders.length > 0
            ? new Date(paidOrders[paidOrders.length - 1].date_add)
            : null,
          lastOrderAt: paidOrders.length > 0
            ? new Date(paidOrders[0].date_add)
            : null,
        },
        update: {
          email: psCustomer.email,
          firstName: psCustomer.firstname,
          lastName: psCustomer.lastname,
          totalOrders: paidOrders.length,
          ltvCalculated: Math.round(ltvCalculated * 100) / 100,
          avgOrderValue: Math.round((ltvCalculated / paidOrders.length) * 100) / 100,
          updatedAt: new Date(),
        },
      });

      imported++;

      // Rate limiting : pause toutes les 10 requêtes
      if (imported % 10 === 0) {
        await sleep(1000); // 1s de pause
        await updateSyncProgress(tenant.id, imported, maxCustomers);
      }
    }

    offset += batchSize;
  }

  return { imported };
}
```

**Note performance :** La sync initiale PrestaShop est plus lente que Shopify car il faut requêter les commandes pour chaque client (PrestaShop ne fournit pas de `total_spent` sur l'endpoint customers). Temps estimé : 15-45 minutes pour 1 000 clients.

---

## 11. Client API PrestaShop

### 11.1 Client Réutilisable

```typescript
class PrestaShopApiClient {
  private baseUrl: string;
  private apiKey: string;
  private rateLimitDelay: number = 200; // 200ms entre les requêtes

  constructor(integration: Integration) {
    this.baseUrl = normalizePrestaShopUrl(integration.shopDomain);
    this.apiKey = decrypt(integration.apiKeyEncrypted);
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  async get(endpoint: string): Promise<any> {
    await sleep(this.rateLimitDelay);

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
      },
    });

    if (response.status === 401) {
      throw new PrestaShopAuthError('API key invalide ou révoquée');
    }
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
      await sleep(retryAfter * 1000);
      return this.get(endpoint); // Retry
    }
    if (!response.ok) {
      throw new PrestaShopApiError(
        `Erreur API (${response.status}): ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  }

  async post(endpoint: string, options: { output_format: string; body: string }): Promise<any> {
    await sleep(this.rateLimitDelay);

    const url = `${this.baseUrl}${endpoint}?output_format=${options.output_format}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new PrestaShopApiError(
        `POST ${endpoint} failed (${response.status}): ${errorBody}`,
        response.status
      );
    }

    return response.json();
  }
}
```

### 11.2 Rate Limiting

PrestaShop n'a pas de rate limiting standard (c'est l'hébergement du tenant qui limite). WinBack applique un délai conservateur :

| Contexte | Délai entre requêtes | Raison |
|----------|---------------------|--------|
| Polling signaux (5min) | 200ms | ~5-15 requêtes par cycle, impact faible |
| Sync initiale | 200ms + pause 1s/10 requêtes | Beaucoup de requêtes, éviter de surcharger |
| Enrichissement | 200ms | 2-3 requêtes par client |
| Attribution | 200ms | ~5-10 requêtes par cycle |

---

## 12. Différences avec Shopify

| Aspect | Shopify | PrestaShop |
|--------|---------|------------|
| **Détection** | Webhooks temps réel | Polling 5 min |
| **Latence signal** | ~1 seconde | ~5 minutes |
| **Order states** | Standardisés | Variables selon installation |
| **LTV client** | `total_spent` sur /customers | Calculée à partir des commandes |
| **Tags client** | Natifs | Absents (modules tiers) |
| **Codes promo** | Price Rules + Discount Codes | Cart Rules |
| **GDPR webhooks** | Obligatoires (3) | Non applicable (pas d'app store) |
| **Authentification** | Custom App Token | Webservice API Key Basic Auth |
| **Sync initiale** | 5-10 min (rapide) | 15-45 min (requêtes commandes/client) |
| **API format** | JSON natif | JSON via `output_format=JSON` |
| **Pagination** | Cursor-based (Link header) | Offset-based (`limit=offset,count`) |
| **Versions API** | Versionné (2025-01) | Non versionné |

---

## 13. Gestion des Erreurs

| Erreur | Cause | Comportement |
|--------|-------|--------------|
| 401 Unauthorized | Clé API révoquée | Marquer intégration ERROR, notifier tenant |
| 403 Forbidden | Permission manquante ou webservice désactivé | LOG error, notifier "Activez le webservice" |
| 404 Not Found | Ressource inexistante | Ignorer silencieusement |
| 429 (si configuré) | Rate limit serveur | Backoff automatique |
| 500/503 | Serveur PrestaShop down | Retry au prochain cycle (5min) |
| Timeout | Serveur lent ou surchargé | Retry au prochain cycle, alerter après 5 échecs |
| SSL Error | Certificat expiré | Alerter tenant "Certificat SSL invalide" |
| XML au lieu de JSON | Paramètre output_format manquant | Détecter, reformater la requête |

**Spécificité PrestaShop :** L'API retourne parfois du XML même quand on demande JSON (bug connu sur certaines versions). Le client API doit gérer ce cas :

```typescript
async function safeParseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('Content-Type') || '';
  const text = await response.text();

  if (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
    return JSON.parse(text);
  }

  if (contentType.includes('text/xml') || text.startsWith('<?xml')) {
    // Fallback : parser le XML
    logger.warn('PrestaShop returned XML instead of JSON, parsing XML');
    return parseXmlToJson(text); // Librairie : fast-xml-parser
  }

  throw new Error(`Unexpected content type: ${contentType}`);
}
```

---

## 14. Dashboard : Vue Intégration PrestaShop

```
┌──────────────────────────────────────────────────────────────┐
│  🟢 PrestaShop — Connecté                                   │
│                                                              │
│  URL : https://www.maboutique.fr                            │
│  Version détectée : PrestaShop 8.1.3                        │
│  Dernière sync signaux : il y a 3 min                       │
│  Dernière sync clients : il y a 4h                          │
│                                                              │
│  ⚠️ Latence de détection : ~5 minutes (polling)              │
│  💡 Upgrade vers le module webhook (V2) pour du temps réel   │
│                                                              │
│  Données synchronisées :                                     │
│  • Clients importés : 1 234 / 10 000 (palier CoY)            │
│  • LTV moyenne : 156€                                        │
│  • Panier moyen : 58€                                        │
│                                                              │
│  Ce mois :                                                   │
│  • Annulations détectées : 18                                │
│  • Remboursements : 9                                        │
│  • Retours produits : 12                                     │
│  • Messages clients : 34                                     │
│  • Conversions attribuées : 7 (521€ récupérés)              │
│                                                              │
│  Permissions API :                                           │
│  ☑ orders  ☑ customers  ☑ order_returns  ☑ customer_messages│
│  ☑ cart_rules (codes promo automatiques ✅)                   │
│                                                              │
│  États de commande détectés :                                │
│  • Annulé → ID 6 ("Annulé")                                │
│  • Remboursé → ID 7 ("Remboursé")                           │
│  • Livré → ID 5 ("Livré")                                  │
│  [Reconfigurer les états]                                    │
│                                                              │
│  [Resynchroniser]  [Tester la connexion]  [Déconnecter]     │
└──────────────────────────────────────────────────────────────┘
```

---

## 15. Gestion de la Déconnexion

```typescript
async function disconnectPrestaShop(tenant: Tenant, integration: Integration): Promise<void> {
  // PrestaShop : pas de webhooks à supprimer (polling)
  // Simplement nettoyer les données d'accès

  await db.integrations.update({
    where: { id: integration.id },
    data: {
      status: 'DISABLED',
      apiKeyEncrypted: null,
      webhookSecret: null,
      config: {
        webhookIds: [],
        orderStateMapping: null,
        pollingState: null,
      },
    },
  });

  // Supprimer l'état de polling
  await deletePollingState(tenant.id, integration.id);

  // Les données clients sont CONSERVÉES
}
```

---

## 16. V2 : Module Webhook PrestaShop

### 16.1 Objectif

Réduire la latence de 5 minutes à ~1 seconde en installant un module PrestaShop custom qui envoie des webhooks à WinBack.

### 16.2 Architecture du Module

```php
// modules/winbackagent/winbackagent.php
class WinbackAgent extends Module {

    public function install() {
        return parent::install()
            && $this->registerHook('actionOrderStatusPostUpdate')  // Changement de statut
            && $this->registerHook('actionProductReturn')           // Retour produit
            && $this->registerHook('actionObjectCustomerMessageAddAfter') // Message client
            && $this->registerHook('actionValidateOrder');          // Nouvelle commande
    }

    public function hookActionOrderStatusPostUpdate($params) {
        $order = new Order($params['id_order']);
        $newState = $params['newOrderStatus']->id;

        // Envoyer le webhook
        $this->sendWebhook('order-status-changed', [
            'order_id' => $order->id,
            'new_state' => $newState,
            'customer_id' => $order->id_customer,
        ]);
    }

    private function sendWebhook(string $event, array $data): void {
        $webhookUrl = Configuration::get('WINBACK_WEBHOOK_URL');
        $secret = Configuration::get('WINBACK_WEBHOOK_SECRET');

        $payload = json_encode($data);
        $signature = hash_hmac('sha256', $payload, $secret);

        // Envoi asynchrone (non bloquant pour le front)
        $ch = curl_init($webhookUrl . '/' . $event);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Winback-Signature: ' . $signature,
                'X-Winback-Event: ' . $event,
            ],
            CURLOPT_TIMEOUT => 5,
            CURLOPT_RETURNTRANSFER => true,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}
```

### 16.3 Roadmap du Module

| Étape | Effort | Planning |
|-------|--------|----------|
| Développement du module PHP | 15h | M8 (post-launch) |
| Page de configuration dans le back-office | 5h | M8 |
| Tests sur PrestaShop 1.7 et 8.x | 5h | M9 |
| Documentation d'installation | 3h | M9 |
| Listing sur PrestaShop Addons (marketplace) | 10h | M10 |

---

## 17. Compatibilité PrestaShop

### 17.1 Versions Supportées

| Version | Support | Notes |
|---------|---------|-------|
| PrestaShop 8.x | ✅ Complet | Version recommandée |
| PrestaShop 1.7.x | ✅ Complet | Encore très répandu en France |
| PrestaShop 1.6.x | ⚠️ Partiel | API différente, certains endpoints manquants |
| PrestaShop < 1.6 | ❌ Non supporté | Trop ancien, API incompatible |

### 17.2 Hébergements Testés

| Hébergeur | Compatibilité | Notes |
|-----------|---------------|-------|
| OVH (mutualisé) | ✅ | Rate limit bas, augmenter le délai polling |
| OVH (VPS/Cloud) | ✅ | Performances optimales |
| Infomaniak | ✅ | Bon support API |
| PlanetHoster | ✅ | |
| o2switch | ✅ | |
| 1&1 IONOS | ⚠️ | Parfois bloqué par le firewall, whitelister l'IP WinBack |

---

## 18. Critères d'Acceptation

| Test | Input | Output attendu | Statut |
|------|-------|----------------|--------|
| Connexion réussie | URL + clé API valides | "Connexion réussie", permissions vérifiées, version détectée | ⬜ |
| Connexion échouée — clé invalide | Mauvaise clé | Erreur "Clé API invalide" | ⬜ |
| Connexion échouée — webservice désactivé | Webservice off | Erreur "Activez le webservice" | ⬜ |
| Connexion échouée — permissions | Clé sans orders | Erreur "Permissions manquantes: orders" | ⬜ |
| Detection order states | Installation avec states custom | Mapping correct par nom (annulé, remboursé) | ⬜ |
| Polling commande annulée | Commande passée en état 6 | NormalizedEvent ORDER_CANCELLED détecté au cycle suivant | ⬜ |
| Polling remboursement | Commande passée en état 7 | NormalizedEvent ORDER_REFUNDED | ⬜ |
| Polling retour produit | Nouveau order_return créé | NormalizedEvent RETURN_CREATED avec raison | ⬜ |
| Polling message client | Nouveau customer_message | NormalizedEvent NEW_TICKET avec body du message | ⬜ |
| Polling ignore message employé | Message d'un employé (id_employee > 0) | Ignoré | ⬜ |
| Déduplication | Même commande annulée vue 2 cycles de suite | Traitée une seule fois | ⬜ |
| Sync initiale | Boutique avec 300 clients actifs | 300 clients importés avec LTV calculée | ⬜ |
| Sync initiale — performance | Boutique avec 1000 clients | Terminé en < 45 min, progression affichée | ⬜ |
| Attribution conversion | Client récupéré passe commande 10j après action | Action CONVERTED, revenue_recovered calculé | ⬜ |
| Attribution — code promo | Commande avec cart_rule WB-XXXX | Attribution confirmée | ⬜ |
| Création cart_rule | Compensation 15%, client spécifique | Cart rule créée dans PrestaShop, usage unique | ⬜ |
| Erreur API — retry | PrestaShop retourne 500 | Retry au prochain cycle (5min) | ⬜ |
| Erreur API — alerte | 5 erreurs consécutives | Alerte envoyée au tenant | ⬜ |
| XML fallback | API retourne du XML au lieu de JSON | Parsé correctement | ⬜ |
| Déconnexion | Clic "Déconnecter" | Clé API effacée, polling arrêté, données conservées | ⬜ |

---

## 19. Questions Ouvertes

- [x] **Multi-boutiques PrestaShop** : ~~1 ou 2 intégrations ?~~ → **2 intégrations séparées.** Chaque boutique = 1 intégration avec son propre `id_shop` et sa propre clé API. Plus simple à gérer côté quotas et isolation. Le tenant peut connecter N boutiques (consomme N slots d'intégration). *(Décidé 2026-02-26)*
- [x] **Modules tiers de SAV** : ~~supporter en V2 ?~~ → **V2, si demande beta.** Pas de développement spéculatif. Si des bêta-testeurs utilisent un module SAV spécifique, on l'évalue. La plupart des PME cibles utilisent Gorgias ou le SAV natif PrestaShop. *(Décidé 2026-02-26)*
- [x] **PrestaShop Addons listing** : ~~publier le module ?~~ → **V2, post-lancement M3+.** Le processus de validation PrestaShop prend 2-4 semaines. En V1, le module webhook est fourni directement au tenant (upload ZIP). Publication Addons quand on a 10+ tenants PrestaShop actifs. *(Décidé 2026-02-26)*
- [x] **Performances polling** : ~~mode doux ?~~ → **Oui.** Polling adaptatif : 5 min par défaut, **15 min automatique** si le temps de réponse API dépasse 3 secondes (détection hébergement lent). Le tenant peut aussi configurer manuellement l'intervalle (5/10/15 min). *(Décidé 2026-02-26)*
- [x] **CSAT PrestaShop** : ~~modules tiers ?~~ → **Non en V1.** Le CSAT est collecté via le mail de suivi WinBack (J+7 post-récupération) et via Gorgias si connecté. Pas d'intégration Avis Vérifiés/Trustpilot en V1. V2 : évaluer les APIs si demande forte. *(Décidé 2026-02-26)*

---

## 20. Historique des Changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-23 | Création du document — intégration PrestaShop V1 | CoYia |