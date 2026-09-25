# Guide de référence — Interfaces d'intégration 2025-2026

> **Objectif :** Documenter les interfaces réelles des plateformes cibles WinBack telles qu'elles apparaissent en 2025-2026, afin que les guides d'onboarding clients soient alignés avec les écrans actuels.
>
> **Règle de vérifiabilité :** Toute information sans source URL confirmée est marquée **"Non confirmé — à vérifier"**.
>
> **Dernière mise à jour :** Mars 2026

---

## Sommaire

- [P1 — Gorgias (Helpdesk)](#gorgias)
- [P1 — Shopify (E-commerce)](#shopify)
- [P1 — PrestaShop (E-commerce)](#prestashop)
- [P2 — iAdvize (Chat)](#iadvize)
- [P2 — Crisp (Chat/Helpdesk)](#crisp)
- [P3 — Zendesk (Helpdesk)](#zendesk)
- [P3 — Freshdesk (Helpdesk)](#freshdesk)
- [P3 — WooCommerce (E-commerce)](#woocommerce)

---

<a name="gorgias"></a>

## Gorgias — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P1
**Type :** Helpdesk

### Sources officielles

- [Documentation développeur Gorgias](https://developers.gorgias.com/)
- [OAuth2 authentication — Gorgias Dev Docs](https://developers.gorgias.com/docs/oauth2-authentication-for-creating-apps-with-gorgias)
- [Building a high-quality Gorgias app](https://developers.gorgias.com/docs/building-a-high-quality-gorgias-app)
- [REST API reference — Gorgias](https://developers.gorgias.com/reference/introduction)

### Prérequis

- Compte Gorgias actif (plan Starter minimum)
- Accès admin au compte Gorgias (rôle "Admin")
- Pour WinBack V1 (API Key) : aucun prérequis supplémentaire
- Pour WinBack V2 (Gorgias App Store) : compte partenaire sur [partners.gorgias.com](https://partners.gorgias.com)

### Arborescence interface Gorgias (2025-2026)

**Structure de navigation du back-office Gorgias :**

```
Gorgias ({sous-domaine}.gorgias.com)
├── [Menu gauche — icônes verticales]
│   ├── Inbox (conversations)
│   ├── Customers
│   ├── Statistics
│   └── Settings (icône engrenage, en bas)
│       ├── You
│       │   ├── Profile
│       │   └── REST API  ← ici pour générer la clé API WinBack
│       ├── Account
│       │   ├── General
│       │   ├── Team
│       │   └── Integrations  ← apps tierces
│       └── Helpdesk
│           ├── Channels
│           ├── Tags
│           └── Macros
```

**Comparaison ancienne vs nouvelle interface :**

| Élément | Avant 2024 | 2025-2026 |
|---------|-----------|-----------|
| Chemin clé API | Settings → REST API (direct) | Settings → **You** → REST API |
| Libellé bouton création | "Add REST API key" | "Generate new token" (selon version) — **À confirmer** |
| OAuth V2 | Optionnel pour App Store | **Obligatoire** pour App Store depuis 2024 |
| Developer Portal | Intégré au dashboard | Séparé sur [partners.gorgias.com](https://partners.gorgias.com) |

### Flux de connexion — WinBack V1 (API Key — implémenté)

**Côté client (dans Gorgias) :**

1. Se connecter à Gorgias (`https://{sous-domaine}.gorgias.com`)
2. Aller dans **Settings** (icône engrenage en bas à gauche) → **You** → **REST API**
3. Cliquer **"Generate new token"** (libellé exact : **À confirmer** — peut varier selon la version Gorgias)
4. Nommer la clé : `WinBack Agent`
5. Sélectionner les permissions :
   - ☑ `Tickets: Read`
   - ☑ `Customers: Read`
   - ☑ `Satisfaction surveys: Read`
6. Cliquer **"Save"** → copier la clé générée

**Côté client (dans WinBack) :**

1. Dashboard WinBack → **Intégrations** → **Connecter Gorgias**
2. Renseigner :
   - Sous-domaine : ex. `maboutique` (extrait de `maboutique.gorgias.com`)
   - Email du compte admin Gorgias
   - Clé API copiée à l'étape précédente
3. Cliquer **"Tester la connexion"**
4. Si validé → WinBack crée automatiquement 3 webhooks dans Gorgias

### Flux de connexion — WinBack V2 (OAuth2 — requis pour App Store)

OAuth2 est **obligatoire** pour tout app listé sur le Gorgias App Store.

1. S'inscrire sur [partners.gorgias.com](https://partners.gorgias.com) → obtenir `client_id` et `client_secret`
2. Rediriger l'utilisateur vers :
   `https://{subdomain}.gorgias.com/oauth/authorize?response_type=code&client_id={id}&redirect_uri={url}&scope={scopes}&state={state}`
3. L'utilisateur autorise → Gorgias redirige vers `redirect_uri` avec un `code`
4. Échanger le code :
   `POST https://{subdomain}.gorgias.com/oauth/token`
   (Basic Auth avec `client_id:client_secret`)
5. Recevoir : `access_token` (24h d'expiration) + `refresh_token` (sans expiration)

### Scopes requis

| Scope | Usage |
|-------|-------|
| `tickets:read` | Lecture des tickets et messages |
| `customers:read` | Profil client et historique |
| `satisfaction_surveys:read` | Scores CSAT |

### Webhooks créés automatiquement par WinBack

| Événement | Déclencheur |
|-----------|-------------|
| `ticket-created` | Nouveau ticket client |
| `ticket-updated` | Ticket modifié / escalade |
| `satisfaction-survey` | CSAT reçu (score ≤ 2/5) |

### Changements récents d'interface (post-2024)

- OAuth2 désormais **obligatoire** pour toute app tierce listée sur le Gorgias App Store (requis depuis la mise à jour partenaires 2024)
- API Key toujours disponible pour les intégrations directes (hors App Store)
- Abonnement newsletter développeur disponible dans **Settings → You → REST API** pour être alerté des breaking changes

### Points de friction et comportements connus

- **Token OAuth2** : expire après 24h → implémenter le refresh token dès V2
- **Sandbox** : fournit via le Developer Portal (accès à un sous-domaine de test)
- **Rate limiting** : varie selon le plan Gorgias (2 req/s sur Starter, 20 req/s sur Advanced)

### Captures / visuels de référence

- [Page Settings > REST API — Gorgias docs](https://docs.gorgias.com/en-US/rest-api-208286)
- [OAuth2 flow diagram — Gorgias Dev Docs](https://developers.gorgias.com/docs/oauth2-authentication-for-creating-apps-with-gorgias)

---

<a name="shopify"></a>

## Shopify — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P1
**Type :** E-commerce

### ⚠️ Changement critique — Janvier 2026

Les **Custom App tokens** (méthode "Admin → Settings → Develop apps → copier token") sont **dépréciées depuis le 1er janvier 2026**. Toute intégration utilisant cette méthode doit migrer vers **OAuth 2.0** via le Partner Dashboard.

WinBack a migré vers OAuth 2.0 (implémenté mars 2026 — voir `src/app/api/shopify/oauth/`).

### Sources officielles

- [Shopify App Configuration (CLI + TOML)](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration)
- [Submit your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
- [About the app review process](https://shopify.dev/docs/apps/launch/app-store-review/review-process)
- [Migrate from Dev Dashboard to CLI](https://shopify.dev/docs/apps/build/cli-for-apps/migrate-from-dashboard)
- [Discussion communauté — Distribution issues Dec 2025](https://community.shopify.dev/t/partner-dashboard-app-distribution-issues/27544)

### Prérequis

- Compte Shopify Partners actif
- App créée dans le Partner Dashboard (ou via Shopify CLI)
- Shopify CLI installé (`npm install -g @shopify/cli`) pour configurer les redirect URLs
- App icon 1200×1200 px (JPEG ou PNG) — requis avant soumission
- Webhooks de conformité souscrits (GDPR)

### Flux de connexion — Côté client WinBack (OAuth 2.0)

1. Dashboard WinBack → **Intégrations** → **Connecter Shopify**
2. Saisir le domaine de la boutique : ex. `maboutique` (de `maboutique.myshopify.com`)
3. Cliquer **"Connecter avec Shopify →"**
4. Redirection vers Shopify : `https://{shop}.myshopify.com/admin/oauth/authorize`
5. Le client autorise les scopes demandés dans l'interface Shopify Admin
6. Shopify redirige vers : `http://localhost:3000/api/shopify/oauth/callback`
7. WinBack échange le code → enregistre le token → crée les webhooks → redirige vers `/integrations?connected=shopify`

### Scopes OAuth requis

| Scope | Usage |
|-------|-------|
| `read_customers` | Profil client, LTV, historique |
| `read_orders` | Commandes, annulations, remboursements |
| `write_discounts` | Création automatique de codes promo (optionnel) |

### Arborescence interface Shopify Partner/Dev Dashboard (2025-2026)

**Ancienne interface Partner Dashboard (avant 2025) :**

```
Partner Dashboard → Apps → [Nom App]
├── Overview
├── App setup
│   ├── URLs
│   │   ├── App URL
│   │   ├── Allowed redirection URL(s)  ← SUPPRIMÉ de l'UI en 2025
│   │   └── Embedded app settings
│   └── Compliance webhooks
├── App listing
└── Pricing plans
```

**Nouvelle interface Dev Dashboard (2025-2026) :**

```
Partner Dashboard → Apps → [Nom App]
├── Aperçu                              ← "Overview" renommé
├── Demandes d'accès à l'API            ← nouveau
├── Performance de l'interface admin    ← nouveau
├── Distribution                        ← contient les options de déploiement
│   ├── Distribution publique (App Store — review obligatoire)
│   └── Distribution personnalisée (lien custom — pas de review)
└── Historique des applications         ← nouveau

Redirect URLs → SUPPRIMÉES de l'UI → CLI uniquement (shopify.app.toml)
```

**Comparaison ancienne vs nouvelle interface :**

| Section | Ancienne (pre-2025) | Nouvelle (2025-2026) |
|---------|--------------------|--------------------|
| Redirect URLs | Champ UI direct "Whitelisted redirect URLs" | **Supprimé** → via CLI uniquement |
| Configuration app | "App setup" avec onglets | Géré via `shopify.app.toml` |
| Distribution | Onglet simple | Page dédiée avec 2 modes distincts |
| "Create a Version" | Accessible pour toutes les apps | Désactivé pour les apps legacy (créées sans CLI) |
| Intitulé des menus | English (Overview, App setup...) | Français si langue FR activée (Aperçu, Distribution...) |

### Flux Partner Dashboard — Configuration technique (2025-2026)

#### Où configurer les redirect URLs

**⚠️ Changement majeur 2025** : La section "App setup > URLs > Whitelisted redirection URLs" a été **supprimée de l'interface graphique** du Partner Dashboard. Les redirect URLs sont maintenant configurées **uniquement via Shopify CLI**.

**Procédure :**

```bash
npm install -g @shopify/cli@latest
mkdir shopify-coyia && cd shopify-coyia
shopify app config link        # Choisir "CoYia Winback"
```

Éditer `shopify.app.toml` :
```toml
[auth]
redirect_urls = [
  "http://localhost:3000/api/shopify/oauth/callback"
]
```

Déployer :
```bash
shopify app deploy
```

Source : [App configuration — shopify.dev](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration)

#### Interface Distribution (Partner Dashboard actuel)

Menu gauche de l'app dans le Partner Dashboard :
- **Aperçu**
- **Demandes d'accès à l'API**
- **Performance de l'interface administrateur**
- **Distribution** ← section concernée
- **Historique des applications**

La page **Distribution** propose deux options :

| Option | Description | Revue requise |
|--------|-------------|---------------|
| **Distribution publique** | Accessible sur l'App Store Shopify (référencée ou non) | ✅ Oui — obligatoire |
| **Distribution personnalisée** | Lien d'installation custom par boutique | ❌ Non |

### Processus de review (Distribution publique)

**Étapes de soumission :**

1. Compléter les vérifications automatisées (checklist dans le Partner Dashboard)
2. Configurer les URLs (via CLI — voir ci-dessus)
3. Souscrire aux webhooks de conformité GDPR
4. Créer un listing App Store avec description et icône (1200×1200 px)
5. Configurer les contacts d'urgence
6. Soumettre → email de confirmation sur l'adresse fournie

**Ajouter aux allowlists email :** `app-submissions@shopify.com` et `noreply@shopify.com`

**Délais :**

| Timeline | Durée |
|----------|-------|
| Officielle | 5-10 jours ouvrés |
| Réelle (2025) | 2 à 4 semaines |

**Statuts possibles :**

- **Draft** — app non soumise
- **Submitted** — soumission reçue
- **Under Review** — en cours d'examen
- **Approved** — approuvée, disponible
- **Rejected** — rejetée avec commentaires
- **Unpublished** — dépubliée après approbation

### Changements récents d'interface (post-2024)

- **Janvier 2026** : Custom App tokens dépréciés → OAuth 2.0 obligatoire
- **2025** : Section "App setup > URLs" supprimée de l'UI → CLI uniquement
- **2025** : Nouveau "Dev Dashboard" remplace partiellement l'ancien "Partner Dashboard"
- **Décembre 2025** : Bug visuel — apps publiées affichées "Draft" / "Unpublished" à tort (corrigé)
- **Annual reviews 2025** : Shopify a introduit des révisions annuelles obligatoires pour les apps existantes

### Points de friction et comportements connus

- **Redirect URLs introuvables** : Confusion fréquente — l'UI ne montre plus le champ → CLI obligatoire
- **Distribution publique ≠ accès immédiat** : La review (2-4 semaines) bloque le lancement en production
- **Distribution personnalisée** : Recommandée pour la Beta M5 — pas de review, lien d'installation custom par boutique
- **"Create a Version" désactivé** pour les apps créées sans CLI (apps legacy)

### Recommandation WinBack pour Beta M5

Utiliser **Distribution personnalisée** pour les 5-10 clients beta (pas de review requise). Soumettre pour **Distribution publique** en parallèle pour avoir l'approbation avant le lancement officiel.

### Captures / visuels de référence

- [Shopify review requirements checklist](https://shopify.dev/docs/apps/launch/app-store-review/review-requirements)
- Non disponible en captures publiques pour l'interface Partner Dashboard actuelle

---

<a name="prestashop"></a>

## PrestaShop — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P1
**Type :** E-commerce

### Sources officielles

- [Webservice API — PrestaShop Developer Documentation](https://devdocs.prestashop-project.org/8/webservice/)
- [Creating access to the Webservice](https://devdocs.prestashop-project.org/8/webservice/tutorials/creating-access/)
- [PrestaShop versions — Help Center](https://help-center.prestashop.com/hc/en-us/articles/11897528831634)
- [Forum — Webservice issues PS 8.2](https://www.prestashop.com/forums/topic/1092852-webservice-do-not-work-after-upgrading-to-82/)

### Prérequis

- PrestaShop **1.7.7 minimum** (recommandé : PS 8.x)
- Accès admin au back-office PrestaShop (rôle SuperAdmin)
- Le webservice doit être activé dans les paramètres
- HTTPS activé sur la boutique (recommandé pour sécuriser les appels API)

### Versions supportées

| Version | Statut | Notes |
|---------|--------|-------|
| PrestaShop 1.7.x | Fin de vie / Legacy | Webservice classique fonctionnel |
| PrestaShop 8.x | Actif | Webservice classique + nouvelle API Admin (partielle) |
| PrestaShop 9.x | Sorti juin 2025 | Symfony 6.4, PHP 8.4+, nouvelle API REST avancée |

### Arborescence back-office PrestaShop (toutes versions)

**Navigation back-office (chemin Webservice) :**

```
Back-office PrestaShop ({boutique.fr}/admin)
├── [Menu gauche — catégories]
│   ├── Tableau de bord
│   ├── Commandes
│   ├── Catalogue
│   ├── Clients
│   ├── Modules
│   ├── Livraisons
│   ├── Paiement
│   ├── International
│   ├── Paramètres de la boutique
│   └── Paramètres avancés  ← ici
│       ├── Performance
│       ├── E-mail
│       ├── Import
│       ├── Équipe
│       ├── Base de données
│       ├── Journaux
│       ├── Informations
│       └── Webservice  ← clé API WinBack (PS 8.x)
│           ou "Service Web" sur certaines versions 1.7 — À confirmer
```

### Comparaison PrestaShop 1.7.x vs 8.x

Les PME françaises sont encore nombreuses sur 1.7 (fin de support officielle depuis octobre 2022 mais toujours en production).

| Critère | PrestaShop 1.7.x | PrestaShop 8.x | PrestaShop 9 (juin 2025) |
|---------|-----------------|----------------|--------------------------|
| **Support officiel** | ❌ Fin de vie (oct. 2022) | ✅ Actif | ✅ Actif |
| **PHP minimum** | 7.2.5 | 7.4 (recommandé 8.1) | 8.1 (recommandé 8.4) |
| **Libellé menu back-office** | "Service Web" **ou** "Webservice" selon la version — **À confirmer** | "Webservice" | N/A — nouvelle API |
| **Chemin back-office** | Paramètres avancés → Service Web **ou** Webservice | Paramètres avancés → Webservice | Paramètres avancés → Webservice (classique) |
| **Chemin URL API** | `/api/` | `/api/` | `/api/` (classique) + nouvelle API sur `/api/v2/` |
| **Webhooks natifs** | ❌ Aucun | ❌ Aucun | ❌ Aucun (classique) |
| **Nouvelle Admin REST API** | ❌ Non disponible | ⚠️ Partielle (PS 8.1+, endpoints limités) | ✅ Progressive (Symfony 6.4) |
| **Format réponse** | XML (défaut) + JSON (`?output_format=JSON`) | XML (défaut) + JSON | XML + JSON + nouvel endpoint JSON |
| **Authentification** | HTTP Basic (clé API + mot de passe vide) | HTTP Basic (clé API + mot de passe vide) | idem + OAuth2 prévu |
| **Compatibilité WinBack** | ✅ Webservice classique | ✅ Webservice classique | ✅ (webservice classique) — tester PS 9 en beta |

**Points d'attention spécifiques :**

- **PS 1.7 fin de vie** : Pas de correctifs sécurité depuis 2022. Informer le client du risque → recommander migration vers PS 8.
- **PS 8.2** : Bug webservice signalé sur le forum officiel (possiblement lié à un certificat HTTPS ou un changement Apache). Toujours vérifier `GET /api/` avant de confirmer la connexion.
- **PS 9 + documentation** : En mars 2026, la documentation webservice PS 9 sur `devdocs.prestashop-project.org` retournait 1 seule ligne. La nouvelle API REST est incomplète. **Rester sur le webservice classique pour V1 WinBack.**
- **Libellé "Service Web" vs "Webservice"** : La traduction française a changé entre 1.7 et 8. Si le client dit "je ne trouve pas Webservice" → lui demander de chercher "Service Web" dans Paramètres avancés.

### Flux de connexion — Côté client (back-office PrestaShop)

**Étape 1 — Activer le Webservice :**

1. Se connecter au back-office PrestaShop (`https://votre-boutique.fr/admin`)
2. Menu : **Paramètres avancés** → **Webservice**
3. Champ **"Activer le webservice PrestaShop"** → sélectionner **"Oui"**
4. Cliquer **"Enregistrer"**

**Étape 2 — Créer une clé API :**

1. Sur la même page **Webservice**, cliquer **"Ajouter une nouvelle clé de webservice"**
2. Renseigner :
   - **Clé** : cliquer **"Générer"** pour créer une clé de 32 caractères
   - **Description** : `WinBack Agent`
   - **Statut** : Actif
3. Configurer les permissions (cocher pour chaque ressource) :

| Ressource | GET | POST | PUT | DELETE |
|-----------|-----|------|-----|--------|
| `orders` | ☑ | | | |
| `order_returns` | ☑ | | | |
| `order_histories` | ☑ | | | |
| `order_states` | ☑ | | | |
| `customers` | ☑ | | | |
| `customer_messages` | ☑ | | | |
| `cart_rules` | ☑ | ☑ | ☑ | |

4. Cliquer **"Enregistrer"** → copier la clé affichée

**Étape 3 — Configurer dans WinBack :**

1. Dashboard WinBack → **Intégrations** → **Connecter PrestaShop**
2. Renseigner :
   - **URL de la boutique** : ex. `https://www.maboutique.fr`
   - **Clé API Webservice**
3. Cliquer **"Tester la connexion"**
4. Si validé → WinBack lance la synchronisation initiale (polling toutes les 5 min)

### Méthode d'authentification

HTTP Basic Auth : clé API en username, mot de passe **vide**.

```
Authorization: Basic base64(apikey:)
```

### Endpoints clés

| Ressource | Endpoint | Usage WinBack |
|-----------|----------|---------------|
| Commandes | `GET /api/orders` | Détection annulations |
| Retours | `GET /api/order_returns` | Signaux produit |
| Messages client | `GET /api/customer_messages` | Analyse texte insatisfaction |
| Threads SAV | `GET /api/customer_threads` | Conversations SAV |
| Clients | `GET /api/customers` | Enrichissement profil |
| Historique états | `GET /api/order_histories` | Tracking statuts |

Format JSON : ajouter `?output_format=JSON` à chaque appel.

### Webhooks

PrestaShop **n'a pas de webhooks natifs** dans son webservice classique.

WinBack utilise le **polling** (cron toutes les 5 minutes) en V1. La V2 introduira un module PrestaShop custom pour les webhooks temps réel.

### Changements récents d'interface (post-2024)

- **Juin 2025** : Sortie de **PrestaShop 9** (Symfony 6.4, PHP 8.4+, nouvelle API Admin REST progressive)
- **PS 8.1+** : Nouvelle API Admin REST en cours de déploiement (partielle — toutes les ressources ne sont pas migrées)
- **PS 8.2** : Problème de compatibilité webservice signalé sur le forum officiel (vérifier la version avant connexion)
- Chemin back-office **inchangé** depuis PS 1.7 : Paramètres avancés → Webservice

### Points de friction et comportements connus

- **Latence** : polling toutes les 5 min vs temps réel Shopify — à expliquer au client lors de l'onboarding
- **Bug PS 8.2** : Webservice potentiellement non fonctionnel après upgrade — recommander la vérification de la version
- **Clé montrée une seule fois** : ne pas fermer la page avant d'avoir copié la clé
- **HTTPS obligatoire** : certaines boutiques hébergées en HTTP n'acceptent pas les appels API sécurisés
- **Permissions granulaires** : si le client donne "toutes les permissions" → risque sécurité. WinBack doit documenter les permissions minimales exactes.

### Espace partenaire PrestaShop Addons

Pour distribuer un module WinBack sur la marketplace PrestaShop Addons :

1. Créer un compte vendeur sur [addons.prestashop.com](https://addons.prestashop.com)
2. Développer le module en respectant les standards PrestaShop
3. Soumettre via l'espace vendeur : upload ZIP + assets (screenshots, description FR/EN)
4. Validation technique par PrestaShop : **5 à 15 jours ouvrés**
5. Validation éditoriale (description, traductions)
6. Publication — module visible sur la marketplace

Commission PrestaShop : **Non confirmé — à vérifier sur la page vendeur Addons**

### Captures / visuels de référence

- [Tutoriel officiel avec captures — Creating access](https://devdocs.prestashop-project.org/8/webservice/tutorials/creating-access/)

---

<a name="iadvize"></a>

## iAdvize — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P2
**Type :** Chat

### Sources officielles

- [iAdvize Developer Platform](https://docs.iadvize.dev/getting-started/general-information)
- [iAdvize GitHub documentation](https://github.com/iadvize/documentation)
- [iAdvize GraphQL API](https://developers.iadvize.com/documentation/graphql-api)
- Contact développeur : developers@iadvize.com

### Prérequis

- Compte iAdvize Business (plan payant — plateforme B2B Enterprise)
- Accès admin au compte iAdvize
- Pour Custom App : accès à l'Administration iAdvize

### Méthode d'authentification

**OAuth2 (Resource Owner Password Credentials flow) :**

```http
POST https://api.iadvize.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

username={email}&password={password}&grant_type=password
```

Réponse :
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

Utilisation dans les requêtes GraphQL :
```http
Authorization: Bearer {access_token}
```

### Arborescence interface iAdvize (2025-2026)

**Back-office Administration iAdvize :**

```
Administration iAdvize ({compte}.iadvize.com/admin)
├── [Menu gauche]
│   ├── Tableau de bord
│   ├── Conversations
│   ├── Équipe
│   ├── Configuration
│   │   ├── Canaux
│   │   ├── Règles de ciblage
│   │   └── Réponses automatiques
│   ├── AI Copilot  ← nouveau (2024-2025)
│   │   └── Workflows
│   │       └── API Connections  ← connexion WinBack (mode API externe)
│   └── Applications
│       └── Custom Apps  ← plugin WinBack dans le panel agent
```

**Deux modes d'intégration WinBack :**

| Mode | Chemin | Usage |
|------|--------|-------|
| **Custom App** (panel agent) | Administration → Applications → Custom Apps | Interface WinBack visible pour l'agent dans son panel |
| **API Connection** (automatisation) | Administration → AI Copilot → Workflows → API Connections | Appels sortants vers l'API WinBack depuis les workflows iAdvize |

### Flux de connexion — Mode Custom App (panel agent)

1. Connexion à l'Administration iAdvize
2. Menu **Applications** → **Custom Apps**
3. Cliquer **"Créer une Custom App"** — **À confirmer** : libellé exact du bouton
4. Configurer :
   - **Nom** : `WinBack Agent`
   - **URL** : URL de l'interface WinBack à afficher dans le panel
   - **Paramètres transmis** : `conversationId`, `visitorId`, `operatorId`
5. Sauvegarder — l'app apparaît dans le panel agent (iframe)

### Flux de connexion — Mode API Connection (automatisation)

1. Connexion à l'Administration iAdvize
2. Menu **AI Copilot** → **Workflows** → **API Connections**
3. Cliquer **"Créer"** — **À confirmer** : libellé exact
4. Configurer :
   - **URL** : endpoint WinBack (`http://localhost:3000/api/iadvize/...`)
   - **Méthode** : POST
   - **Inputs** : conversation data
   - **Outputs** : action de récupération
   - **Timeout** : ≤ 6 secondes (limite iAdvize)
5. Connecter à un workflow iAdvize

### API GraphQL iAdvize

Endpoint : `POST https://api.iadvize.com/graphql`

Exemple de requête (liste des conversations) :
```graphql
query {
  conversations(first: 10) {
    edges {
      node {
        id
        status
        createdAt
        visitor {
          id
          name
        }
        messages {
          edges {
            node {
              content
              author { type }
            }
          }
        }
      }
    }
  }
}
```

### Webhooks iAdvize

iAdvize supporte les webhooks pour les événements de conversation (documentation sur GitHub `iadvize/documentation`).

| Événement | Description |
|-----------|-------------|
| `conversation.created` | Nouvelle conversation ouverte |
| `conversation.closed` | Conversation fermée |
| `message.created` | Nouveau message dans une conversation |

Configuration : **À confirmer** — chemin exact dans Administration iAdvize.

### Changements récents d'interface (post-2024)

- **2024-2025** : Introduction du module **AI Copilot** avec les Workflows et API Connections — nouveau mode d'intégration sans code dans le panel agent
- **2025** : Migration progressive de REST API vers GraphQL API (REST partiellement déprécié)
- **À confirmer** : Changelog public non accessible sans compte partenaire

### Points de friction et comportements connus

- **Timeout 6 secondes** : Les appels depuis les API Connections doivent répondre en ≤ 6s — critique pour WinBack (scoring IA potentiellement lent)
- **Plateforme B2B Enterprise** : Intégration partenaire potentiellement soumise à accord commercial préalable — contacter `developers@iadvize.com` avant de démarrer
- **Documentation partielle** : Certaines fonctionnalités (Authenticated Messaging JWE/JWS) nécessitent un compte partenaire pour accéder à la doc complète

---

<a name="crisp"></a>

## Crisp — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P2
**Type :** Chat / Helpdesk

### Sources officielles

- [Crisp REST API v1 Reference](https://docs.crisp.chat/references/rest-api/v1/)
- [Crisp Marketplace](https://marketplace.crisp.chat)
- [Crisp Developer signup](https://app.crisp.chat/)

### Prérequis

- Compte Crisp (plan Pro minimum pour accès API)
- Inscription sur [marketplace.crisp.chat](https://marketplace.crisp.chat) pour un plugin public
- `website_id` de la boutique du client

### Méthode d'authentification

Authentification par **token de plugin** : identifiant + clé combinés en Basic Auth.

```
Header: X-Crisp-Tier: plugin
Authorization: Basic base64({identifier}:{key})
```

Le token est généré lors de la création du plugin sur [marketplace.crisp.chat](https://marketplace.crisp.chat) — **pas dans l'interface `app.crisp.chat`**.

### Arborescence interface Crisp (2025-2026)

**Deux interfaces distinctes :**

```
app.crisp.chat (interface utilisateur final)
├── Inbox
├── Contacts
├── Analytics
└── Settings
    ├── Website
    │   ├── General
    │   ├── Appearance
    │   ├── Chatbox
    │   └── ...
    └── Account

marketplace.crisp.chat (interface développeur/plugin)  ← ici pour WinBack
├── My Plugins  ← liste des plugins créés
├── Create a Plugin  ← création nouveau plugin
└── Documentation
```

**Comparaison ancienne vs nouvelle interface :**

| Élément | Avant 2024 | 2025-2026 |
|---------|-----------|-----------|
| Création plugin | marketplace.crisp.chat | marketplace.crisp.chat (inchangé) |
| Token d'auth | API Key dans app.crisp.chat | Token de plugin dans marketplace.crisp.chat |
| Scopes | Déclarés à la création | Déclarés à la création — **immuables** (ne peuvent pas être modifiés après) |
| Type d'auth | Basic Auth classique | `X-Crisp-Tier: plugin` header obligatoire |

### Flux de connexion — Création plugin (côté WinBack sur Marketplace Crisp)

**Étape 1 — Créer le plugin :**

1. Se connecter sur [marketplace.crisp.chat](https://marketplace.crisp.chat) avec un compte Crisp
2. Cliquer **"Create a Plugin"** — **À confirmer** : libellé exact du bouton
3. Renseigner :
   - **Nom** : `WinBack Agent`
   - **Description** : description de l'intégration
   - **Website** : site Crisp cible
   - **Scopes** : sélectionner les scopes requis (voir ci-dessous) — **attention : immuables après création**
   - **Webhook events** : sélectionner les événements à recevoir
4. Soumettre → recevoir le **token identifier** et **token key**

**⚠️ Note critique :** Les scopes déclarés à la création du plugin sont **définitifs**. Si des scopes manquent, il faut créer un nouveau plugin.

**Étape 2 — Configurer dans WinBack :**

1. Dashboard WinBack → **Intégrations** → **Connecter Crisp**
2. Renseigner :
   - **Website ID** Crisp (visible dans app.crisp.chat → Settings → Website)
   - **Token identifier** (fourni à la création du plugin)
   - **Token key** (fourni à la création du plugin)
3. WinBack souscrit automatiquement aux webhooks configurés

### Scopes requis

| Scope | Usage |
|-------|-------|
| `website:conversation:sessions` | Accès aux sessions de conversation |
| `website:conversation:messages` | Lecture des messages |
| `website:conversation:states` | États des conversations (ouvert/fermé) |

### Endpoints clés

| Endpoint | Usage |
|----------|-------|
| `GET /v1/website/{website_id}/conversations/{page_number}` | Lister les conversations |
| `GET /v1/website/{website_id}/conversation/{session_id}` | Détail d'une conversation |
| `GET /v1/website/{website_id}/conversation/{session_id}/messages` | Messages d'une conversation |

Base URL : `https://api.crisp.chat`

### Webhooks Crisp

Les événements webhook sont déclarés lors de la création du plugin (voir ci-dessus).

| Événement | Usage WinBack |
|-----------|---------------|
| `message:send` | Message entrant client |
| `message:received` | Message reçu (réponse agent) |
| `conversation:resolved` | Ticket résolu |
| `conversation:unresolved` | Ticket rouvert |

### Marketplace Crisp — Soumission plugin public

Pour une distribution publique sur le Marketplace Crisp (V2) :

1. Créer le plugin sur marketplace.crisp.chat
2. Compléter le listing (description, screenshots)
3. Soumettre pour review
4. **Délai de review** : **Non confirmé** — à vérifier directement sur marketplace.crisp.chat

### Changements récents d'interface (post-2024)

- **Non confirmé** — Pas de changelog public récent trouvé

### Points de friction et comportements connus

- **Scopes immuables** : Le piège principal — déclarer TOUS les scopes nécessaires dès la création (impossible de les ajouter après)
- **Header obligatoire** : `X-Crisp-Tier: plugin` — les appels sans ce header retournent une erreur 403
- API bien documentée publiquement — intégration accessible sans accord partenaire préalable
- Rate limiting : **Non confirmé** — vérifier les limites par plan sur docs.crisp.chat

---

<a name="zendesk"></a>

## Zendesk — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P3
**Type :** Helpdesk

### Sources officielles

- [Zendesk Marketplace — Developer Docs](https://developer.zendesk.com/documentation/marketplace/)
- [Global OAuth client setup](https://developer.zendesk.com/documentation/marketplace/building-a-marketplace-app/set-up-a-global-oauth-client/)
- [OAuth Tokens — Zendesk API](https://developer.zendesk.com/api-reference/ticketing/oauth/oauth_tokens/)
- [Using OAuth — Zendesk Help](https://support.zendesk.com/hc/en-us/articles/4408845965210-Using-OAuth-authentication-with-your-application)

### Prérequis

- Compte Zendesk Developer (sous-domaine avec préfixe `d3v-` pour les soumissions OAuth)
- App enregistrée dans le [Zendesk Marketplace portal](https://developer.zendesk.com/documentation/marketplace/)
- Les apps Marketplace faisant des requêtes serveur doivent utiliser **Global OAuth** (pas de partage de credentials clients)

### Méthode d'authentification

**OAuth 2.0 (obligatoire pour les apps Marketplace) — `Client Kind: Confidential`.**

Pour les intégrations directes : API Token (Basic Auth : `{email}/token:{api_token}`)

⚠️ Le client secret OAuth est **affiché une seule fois** à la création — le copier immédiatement.

### Arborescence interface Zendesk (2025-2026)

**Admin Center (hub de configuration principal) :**

```
Zendesk Admin Center ({sous-domaine}.zendesk.com/admin)
├── Compte
│   ├── Sécurité
│   └── Abonnement
├── Personnes
│   ├── Équipe
│   └── Groupes
├── Canaux
│   ├── E-mail
│   ├── Chat en direct
│   └── ...
├── Objets et règles
├── Espaces de travail
└── Apps et intégrations  ← ici pour WinBack
    ├── APIs
    │   ├── API Zendesk  ← API Token (intégration directe)
    │   └── OAuth clients  ← création client OAuth
    ├── Apps
    │   ├── Marketplace Zendesk  ← apps publiques
    │   └── Mes apps  ← apps privées installées
    ├── Intégrations
    │   └── Webhooks
    └── Global OAuth  ← via Marketplace Developer Portal (séparé)
```

**Deux espaces distincts :**

| Espace | URL | Usage |
|--------|-----|-------|
| Admin Center | `{sous-domaine}.zendesk.com/admin` | Configuration quotidienne (API tokens, OAuth clients internes) |
| Marketplace Developer Portal | `developer.zendesk.com` | Soumission d'apps et Global OAuth pour apps Marketplace |

**Comparaison ancienne vs nouvelle interface :**

| Élément | Avant 2024 | 2025-2026 |
|---------|-----------|-----------|
| Hub de config | Plusieurs interfaces séparées | Admin Center unifié |
| OAuth clients | Accessible dans "Settings" | Admin Center → Apps et intégrations → APIs → OAuth clients |
| API Token | Settings → API | Admin Center → Apps et intégrations → APIs → API Zendesk |
| Webhooks | Settings → Extensions | Admin Center → Apps et intégrations → Intégrations → Webhooks |

### Flux de connexion — API Token (intégration directe)

1. Se connecter au compte Zendesk
2. Menu : **Admin Center** → **Apps et intégrations** → **APIs** → **API Zendesk**
3. Section **"Token access"** → activer si désactivé
4. Cliquer **"Add API token"** — **À confirmer** : libellé exact
5. Nommer le token : `WinBack Agent`
6. **Copier immédiatement** le token affiché (affiché une seule fois)

### Flux de connexion — OAuth (pour app Marketplace)

**Côté développeur (Marketplace Developer Portal) :**

1. Se connecter sur le [Zendesk Marketplace Developer Portal](https://developer.zendesk.com)
2. Menu gauche : **Global OAuth**
3. Cliquer **"Request new OAuth"**
4. Remplir le formulaire :
   - Le sous-domaine de test doit avoir le préfixe `d3v-`
   - **Client Kind** : `Confidential` (obligatoire pour les apps serveur)
5. Récupérer `client_id` et `client_secret` — **secret affiché une seule fois**

**Flux OAuth standard :**

```
GET {sous-domaine}.zendesk.com/oauth/authorizations/new
  ?response_type=code
  &client_id={client_id}
  &redirect_uri={redirect_uri}
  &scope={scopes}
  &state={state}
```

Échange du code (expire après **120 secondes**) :
```
POST {sous-domaine}.zendesk.com/oauth/tokens
  grant_type=authorization_code
  &code={code}
  &client_id={client_id}
  &client_secret={client_secret}
  &redirect_uri={redirect_uri}
```

### Scopes requis

| Scope | Accès |
|-------|-------|
| `tickets:read` | Lecture des tickets (GET uniquement) |
| `read` | Accès complet en lecture (tous les endpoints GET) |

### Flux côté client Zendesk (installation app Marketplace)

1. Admin Center → **Apps et intégrations** → **Marketplace Zendesk** → rechercher `WinBack`
2. Cliquer **"Installer"** — **À confirmer** : libellé exact
3. Autoriser les scopes demandés
4. L'app apparaît dans **Mes apps**

### Marketplace Zendesk — Soumission

- Divulguer dans le listing quelles données Zendesk sont accédées et pourquoi
- Passer la revue de sécurité Zendesk
- **Délai de review** : **Non confirmé** — à vérifier sur developer.zendesk.com

### Changements récents d'interface (post-2024)

- **2024** : Introduction du "Marketplace partner developer support" — nouveau canal de support pour les partenaires
- **Admin Center** : Hub de configuration unifié — chemins de navigation modifiés vs ancienne interface "Settings"
- **Non confirmé** : Autres changements d'interface post-2024

### Points de friction et comportements connus

- **Code OAuth expire en 120 secondes** — délai très court, implémenter l'échange immédiatement après le redirect
- **Client secret une seule fois** — si perdu, recréer le client OAuth entièrement
- **Global OAuth** (Marketplace) ≠ **OAuth clients** (Admin Center interne) — deux systèmes distincts
- Sous-domaine `d3v-` obligatoire pour les soumissions OAuth — utiliser un compte développeur dédié

---

<a name="freshdesk"></a>

## Freshdesk — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P3
**Type :** Helpdesk

### Sources officielles

- [Freshdesk API Documentation](https://developers.freshdesk.com/api/)
- [Freshdesk OAuth — Developer Docs](https://developers.freshdesk.com/v2/docs/oauth/)
- [Freshdesk Quick Start](https://developers.freshdesk.com/v2/docs/quick-start/)

### Prérequis

- Compte Freshdesk actif
- Accès agent (le rôle de l'agent détermine ce que l'API peut lire)
- Pour app Freshworks Marketplace : compte développeur Freshworks

### Méthode d'authentification

**API Key uniquement — confirmé par Freshworks (2025).**

Contrairement à la documentation officielle qui mentionne OAuth, Freshdesk n'implémente en pratique que l'authentification par API Key pour les intégrations tierces. **Confirmé par un employé Freshworks sur le forum développeur en 2025.**

HTTP Basic Auth : `apikey` en username, `X` comme mot de passe fictif.

```
Authorization: Basic base64(apikey:X)
```

Note : La [documentation OAuth](https://developers.freshdesk.com/v2/docs/oauth/) existe mais l'implémentation réelle ne permet pas l'OAuth pour des apps tierces en 2025-2026 — **À re-vérifier** si Freshworks publie un changelog indiquant un changement.

### Arborescence interface Freshdesk (2025-2026)

**Navigation back-office Freshdesk :**

```
Freshdesk ({sous-domaine}.freshdesk.com)
├── [Menu gauche — icônes]
│   ├── Tableau de bord
│   ├── Tickets
│   ├── Contacts
│   ├── Entreprises
│   ├── Solutions (base de connaissances)
│   └── Rapports
├── [Menu haut à droite]
│   ├── Notifications (cloche)
│   ├── Avatar utilisateur  ← ici pour l'API Key
│   │   ├── Profile Settings  ← clé API dans la section droite
│   │   ├── My Activities
│   │   └── Log out
│   └── Admin (engrenage)
│       ├── Canaux
│       ├── Automatisation  ← webhooks sortants
│       │   └── Règles d'automatisation
│       │       └── Sur création de ticket
│       │           └── Action : Trigger Webhook  ← webhooks WinBack
│       ├── Agents
│       └── ...
```

**Comparaison ancienne vs nouvelle interface :**

| Élément | Avant 2024 | 2025-2026 |
|---------|-----------|-----------|
| Chemin API Key | Avatar → Profile → API Key | Avatar → Profile Settings → section droite **"Your API Key"** |
| Webhooks | Admin → Automations | Admin → **Automatisation** → Règles → Action "Trigger Webhook" |
| Libellés | Principalement en anglais | FR si langue configurée (variable) |

### Où trouver la clé API (côté client Freshdesk)

1. Se connecter à Freshdesk (`{sous-domaine}.freshdesk.com`)
2. Cliquer sur l'**avatar** en haut à droite
3. Sélectionner **"Profile Settings"**
4. Le champ **"Your API Key"** est visible dans la section droite de la page
5. Copier la clé

### Flux de connexion — Côté client WinBack (API Key)

1. Dashboard WinBack → **Intégrations** → **Connecter Freshdesk**
2. Renseigner :
   - Sous-domaine Freshdesk : ex. `maboutique` (de `maboutique.freshdesk.com`)
   - Clé API
3. WinBack test la connexion et configure le polling (pas de webhooks natifs simples)

### Endpoints clés

| Ressource | Endpoint | Usage |
|-----------|----------|-------|
| Tickets | `GET /api/v2/tickets` | Lister les tickets |
| Conversations | `GET /api/v2/tickets/{id}/conversations` | Messages d'un ticket |
| Contacts | `GET /api/v2/contacts/{id}` | Profil client |

Base URL : `https://{subdomain}.freshdesk.com`

Toutes les requêtes en **HTTPS uniquement**.

### Changements récents d'interface (post-2024)

**Non confirmé** — Vérifier [What's New](https://developers.freshdesk.com/v2/docs/what's-new/) sur developers.freshdesk.com

### Points de friction et comportements connus

- Les conversations avec plus de **30 entrées** nécessitent une pagination — à gérer dans le code WinBack
- Les droits de l'agent utilisé pour l'API key limitent ce qui est lisible — recommander un rôle admin dédié

---

<a name="woocommerce"></a>

## WooCommerce — Interface de connexion (mis à jour : mars 2026)

**Priorité WinBack :** P3
**Type :** E-commerce

### Sources officielles

- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WooCommerce REST API — Developer Docs](https://developer.woocommerce.com/docs/apis/rest-api/)
- [WooCommerce REST API — WooCommerce Help Center](https://woocommerce.com/document/woocommerce-rest-api/)
- [WooCommerce API Key Guide — WP Engine](https://wpengine.com/resources/woocommerce-api-key-guide/)

### Prérequis

- WordPress avec plugin WooCommerce installé (WooCommerce 3.5+ minimum, 8.x recommandé)
- Rôle WordPress **Administrator** ou **Shop Manager** (seuls ces rôles peuvent générer des clés API)
- HTTPS activé sur la boutique

### Méthode d'authentification

**Clés API WooCommerce** — Consumer Key + Consumer Secret.

Authentication : HTTP Basic Auth (`consumer_key:consumer_secret`) ou via paramètres URL (déconseillé).

### Arborescence back-office WooCommerce (2025-2026)

**Navigation back-office WordPress (chemin clés API WooCommerce) :**

```
WordPress back-office ({boutique.fr}/wp-admin)
├── [Menu gauche]
│   ├── Tableau de bord
│   ├── Articles
│   ├── Médias
│   ├── Pages
│   ├── WooCommerce  ← ici
│   │   ├── Commandes
│   │   ├── Clients
│   │   ├── Rapports
│   │   └── Réglages (ou "Settings")  ← ici
│   │       ├── Général
│   │       ├── Produits
│   │       ├── Expédition
│   │       ├── Paiements
│   │       ├── Comptes et confidentialité
│   │       └── Avancé (ou "Advanced")  ← ici
│   │           ├── Installations de page
│   │           ├── API REST  ← clés API WinBack
│   │           ├── Webhooks  ← webhooks sortants WinBack
│   │           └── Legacy API
│   └── ...
```

**Comparaison ancienne vs nouvelle interface :**

| Élément | Avant WC 8 | WooCommerce 8.x (2025-2026) |
|---------|-----------|---------------------------|
| Chemin clés API | WooCommerce → Réglages → Avancé → API REST | Identique — inchangé |
| Webhooks | WooCommerce → Réglages → Avancé → Webhooks | Identique — inchangé |
| Libellé bouton | "Add Key" (EN) | "Ajouter une clé" (FR) ou "Add Key" selon la locale |
| Interface générale | WooCommerce 7.x style | UI légèrement modernisée en WC 8.x — navigation stable |

### Deux modes de connexion disponibles

| Mode | Description | Recommandé pour |
|------|-------------|-----------------|
| **Manuel** (back-office) | Client génère les clés dans WP Admin, les saisit dans WinBack | Clients non-techniques préférant tout contrôler |
| **Automatique** (`/wc-auth/v1/authorize`) | WinBack redirige vers Shopify-like OAuth WooCommerce | Onboarding fluide — recommandé WinBack V1 |

### Flux de connexion — Mode automatique (recommandé)

WooCommerce fournit un endpoint d'autorisation natif qui génère les clés automatiquement :

```
GET {boutique.fr}/wc-auth/v1/authorize
  ?app_name=WinBack+Agent
  &scope=read
  &user_id={user_id_interne}
  &return_url={http://localhost:3000/api/woocommerce/callback}
  &callback_url={http://localhost:3000/api/woocommerce/keys}
```

**Flux :**
1. Dashboard WinBack → **Intégrations** → **Connecter WooCommerce**
2. Saisir l'URL de la boutique
3. WinBack redirige vers l'endpoint `/wc-auth/v1/authorize` de la boutique
4. Le client voit une page de confirmation WooCommerce (liste les permissions demandées)
5. Cliquer **"Approuver"** → WooCommerce POST les clés vers le `callback_url` WinBack
6. WinBack reçoit `consumer_key` + `consumer_secret` automatiquement
7. Redirection vers `return_url` avec confirmation

⚠️ Nécessite HTTPS sur la boutique (HTTP → erreur de génération de clés).

### Flux de connexion — Mode manuel (back-office WordPress)

1. Se connecter au back-office WordPress (`https://boutique.fr/wp-admin`)
2. Menu : **WooCommerce** → **Réglages**
3. Onglet : **Avancé**
4. Sous-onglet : **API REST**
5. Cliquer **"Ajouter une clé"**
6. Renseigner :
   - **Description** : `WinBack Agent`
   - **Utilisateur** : sélectionner le compte admin
   - **Permissions** : **Lecture** (Read)
7. Cliquer **"Générer la clé API"**
8. **⚠️ Copier immédiatement** le Consumer Key et Consumer Secret — affichés une seule fois

**Côté WinBack (mode manuel) :**

1. Dashboard WinBack → **Intégrations** → **Connecter WooCommerce**
2. Renseigner :
   - URL de la boutique : ex. `https://www.maboutique.fr`
   - Consumer Key
   - Consumer Secret
3. WinBack teste et lance le polling

### Endpoints clés

| Ressource | Endpoint | Usage |
|-----------|----------|-------|
| Commandes | `GET /wp-json/wc/v3/orders` | Détection annulations |
| Clients | `GET /wp-json/wc/v3/customers` | Enrichissement profil |
| Remboursements | `GET /wp-json/wc/v3/orders/{id}/refunds` | Signaux churn |
| Produits | `GET /wp-json/wc/v3/products` | Contexte produit |

### Webhooks disponibles (WooCommerce natif)

WooCommerce dispose de **webhooks natifs** (contrairement à PrestaShop).

Configuration : **WooCommerce → Réglages → Avancé → Webhooks → Ajouter un webhook**

| Événement disponible | Usage WinBack |
|---------------------|---------------|
| `order.created` | Nouvelle commande |
| `order.updated` | Modification commande |
| `order.deleted` | Suppression |
| `customer.created` | Nouveau client |
| `customer.updated` | Modification client |

### Changements récents d'interface (post-2024)

- WooCommerce 8.x (2024-2025) : Interface de réglages légèrement modernisée mais chemin de navigation stable
- WordPress 6.x : Pas d'impact sur le chemin WooCommerce → Réglages → Avancé → API REST
- **Non confirmé** : Changements spécifiques à WooCommerce 9.x (si sorti)

### Points de friction et comportements connus

- **Clé affichée une seule fois** — friction majeure lors de l'onboarding : bien insister dans le guide
- Selon la configuration d'hébergement, l'URL de l'API peut être `/wp-json/wc/v3/` ou `/?wc-api/v3/` (ancienne) — WinBack doit tester les deux
- Certains hébergeurs mutualisés bloquent les requêtes API Basic Auth — recommander de vérifier auprès de l'hébergeur

---

## Notes d'utilisation pour les guides WinBack

### Plateformes avec accès partenaire public

| Plateforme | Documentation publique | Review requise |
|-----------|----------------------|----------------|
| Gorgias | ✅ Oui (developers.gorgias.com) | ✅ Oui (App Store) |
| Shopify | ✅ Oui (shopify.dev) | ✅ Oui (public) / ❌ Non (custom) |
| PrestaShop | ✅ Oui (devdocs.prestashop-project.org) | ✅ Oui (Addons) |
| Crisp | ✅ Oui (docs.crisp.chat) | Non confirmé |
| WooCommerce | ✅ Oui (woocommerce.github.io) | ❌ Non (API directe) |
| Zendesk | ✅ Oui (developer.zendesk.com) | Non confirmé |
| Freshdesk | ✅ Oui (developers.freshdesk.com) | Non confirmé |
| iAdvize | ⚠️ Partiel (docs.iadvize.dev) | Accord partenaire probablement requis |

### Plateformes sans webhooks natifs (polling requis en V1)

| Plateforme | Solution V1 WinBack | Solution V2 |
|-----------|---------------------|-------------|
| PrestaShop | Polling cron 5 min | Module PrestaShop custom |
| Freshdesk | Polling (à confirmer) | Webhooks Freshdesk (à vérifier) |
