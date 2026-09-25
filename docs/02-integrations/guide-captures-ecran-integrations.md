# Guide de captures d'écran pour les intégrations WinBack Agent
_Document de production — Mars 2026_

---

## Objectif

Ce document liste toutes les captures d'écran à réaliser pour illustrer les guides d'onboarding des intégrations WinBack Agent.

**Format recommandé des captures :**
- Résolution : 1920x1080 (ou équivalent HD)
- Format : PNG ou JPG
- Annotations : encadrer en rouge les boutons/champs clés
- Nommage : `{plateforme}-etape{N}-{description}.png`
  - Exemple : `shopify-etape2-create-version.png`

---

## 1. GORGIAS — 3 captures à réaliser

### Capture 1 : Saisie du domaine (côté WinBack)
**Où :** Interface WinBack  
**Action :** Afficher le formulaire de connexion Gorgias  
**Éléments à capturer :**
- Champ "Votre sous-domaine Gorgias" (ex: `mamarque.gorgias.com`)
- Bouton "Connecter Gorgias"
- Note explicative si présente

**Nommage :** `gorgias-etape1-saisie-domaine.png`

---

### Capture 2 : Écran d'autorisation OAuth (côté Gorgias)
**Où :** Compte développeur Gorgias (nécessite un accès dev)  
**Action :** Déclencher le flow OAuth depuis WinBack  
**Éléments à capturer :**
- Nom de l'application : "WinBack Agent"
- Liste des permissions demandées (scopes) :
  - `openid`
  - `offline`
  - `tickets:read`
  - `tickets:write`
  - `customers:read`
  - `customers:write`
- Bouton "Authorize" ou "Autoriser"

**Nommage :** `gorgias-etape2-authorize-oauth.png`

---

### Capture 3 : Confirmation de connexion (côté WinBack)
**Où :** Interface WinBack après redirection OAuth  
**Action :** Page de succès post-connexion  
**Éléments à capturer :**
- Message "Gorgias est connecté" avec icône check vert
- Nom du compte connecté si affiché
- Premier ticket récupéré (optionnel)

**Nommage :** `gorgias-etape3-confirmation.png`

---

## 2. SHOPIFY — 4 captures à réaliser

### Capture 1 : Vue de l'app dans le Dev Dashboard
**Où :** Shopify Partners → Apps & Sales Channels → [Votre App WinBack]  
**Action :** Afficher le tableau de bord de l'app  
**Éléments à capturer :**
- Nom de l'app "WinBack Agent"
- Menu latéral avec "Versions" visible

**Nommage :** `shopify-etape1-dev-dashboard.png`

---

### Capture 2 : Section Versions → Create a Version
**Où :** Dev Dashboard → Versions  
**Action :** Cliquer sur "Create a Version" ou afficher une version existante  
**Éléments à capturer :**
- Bouton "Create a Version"
- Champs visibles :
  - **App URL**
  - **Allowed Redirect URL(s)** ← zone clé
  - **Scopes**

**Nommage :** `shopify-etape2-create-version.png`

---

### Capture 3 : Écran d'installation côté marchand
**Où :** Boutique Shopify (client) → installation de l'app  
**Action :** Cliquer sur le lien d'installation WinBack depuis une boutique test  
**Éléments à capturer :**
- Page Shopify "Install app"
- Nom de l'app : "WinBack Agent"
- Liste des permissions (scopes) demandées
- Bouton "Install app"

**Nommage :** `shopify-etape3-install-app.png`

---

### Capture 4 : Confirmation post-installation (côté WinBack)
**Où :** Interface WinBack après redirection OAuth  
**Action :** Page de succès  
**Éléments à capturer :**
- Message "Votre boutique Shopify est connectée"
- Nom de la boutique affiché
- Bouton "Commencer" ou équivalent

**Nommage :** `shopify-etape4-confirmation.png`

---

## 3. PRESTASHOP — 5 captures à réaliser

### Capture 1 : Menu Paramètres avancés → Webservice
**Où :** Back-office PrestaShop → Paramètres avancés → Webservice  
**Action :** Naviguer dans le menu  
**Éléments à capturer :**
- Menu "Paramètres avancés" ouvert
- Sous-menu "Webservice" sélectionné

**Nommage :** `prestashop-etape1-menu-webservice.png`

---

### Capture 2 : Activation du service web
**Où :** Page Webservice  
**Action :** Activer le webservice  
**Éléments à capturer :**
- Switch "Activer le service web PrestaShop" sur **Oui**
- Bouton "Enregistrer"

**Nommage :** `prestashop-etape2-activer-webservice.png`

---

### Capture 3 : Formulaire "Ajouter une clé"
**Où :** Page Webservice → Ajouter une nouvelle clé  
**Action :** Cliquer sur "Ajouter une nouvelle clé"  
**Éléments à capturer :**
- Champ "Clé" avec bouton "Générer !"
- Champ "Description" (saisir "WinBack Agent")
- Tableau des permissions par ressource :
  - Cocher : `orders`, `customers`, `order_states`, `products`, `addresses`, `carts`
  - Colonne GET cochée pour toutes

**Nommage :** `prestashop-etape3-formulaire-cle.png`

---

### Capture 4 : Liste des clés avec clé WinBack
**Où :** Page Webservice après sauvegarde  
**Action :** Afficher la liste des clés  
**Éléments à capturer :**
- Tableau avec colonnes : Clé, Description, Actif
- Ligne "WinBack Agent" visible avec clé (floutée si nécessaire)

**Nommage :** `prestashop-etape4-liste-cles.png`

---

### Capture 5 : Formulaire WinBack (saisie des credentials)
**Où :** Interface WinBack  
**Action :** Formulaire de connexion PrestaShop  
**Éléments à capturer :**
- Champ "URL de votre boutique" (ex: `https://ma-boutique.com`)
- Champ "Clé API Webservice"
- Bouton "Tester la connexion"

**Nommage :** `prestashop-etape5-formulaire-winback.png`

---

## 4. iADVIZE — 2 captures à réaliser

### Capture 1 : Écran Developer Platform (si accès disponible)
**Où :** Compte iAdvize avec accès développeur  
**Action :** Naviguer vers la Developer Platform  
**Éléments à capturer :**
- Menu ou section "Developer" / "API"
- Indication de l'existence de clés API REST / GraphQL

**Nommage :** `iadvize-etape1-developer-platform.png`

**⚠️ Note :** Si vous n'avez pas accès, indiquer "Accès partenaire requis"

---

### Capture 2 : Écran WinBack "Intégration Bêta privée"
**Où :** Interface WinBack  
**Action :** Afficher la page d'intégration iAdvize  
**Éléments à capturer :**
- Badge "Bêta privée"
- Message : "Cette intégration nécessite un accès partenaire iAdvize"
- Bouton "Contacter le support WinBack"

**Nommage :** `iadvize-etape2-beta-privee.png`

---

## 5. CRISP — 5 captures à réaliser

### Capture 1 : Marketplace Crisp → New Plugin
**Où :** https://marketplace.crisp.chat → Section Plugins  
**Action :** Afficher la page de création de plugin  
**Éléments à capturer :**
- Bouton "New Plugin"
- Liste des plugins existants (optionnel)

**Nommage :** `crisp-etape1-new-plugin.png`

---

### Capture 2 : Formulaire de création du plugin
**Où :** Formulaire de création plugin  
**Action :** Remplir les informations du plugin WinBack  
**Éléments à capturer :**
- Champ "Name" : "WinBack Agent"
- Champ "Description"
- Section **Scopes** avec les cases cochées :
  - `website:conversation:sessions`
  - `website:conversation:messages`
  - `website:people:profile`
  - `website:people:conversations`

**Nommage :** `crisp-etape2-formulaire-plugin.png`

---

### Capture 3 : Onglet API du plugin
**Où :** Plugin créé → Onglet "API"  
**Action :** Afficher les credentials  
**Éléments à capturer :**
- Champ **Identifier** (UUID)
- Champ **Key** (clé API, floutée si sensible)
- Note "X-Crisp-Tier: plugin"

**Nommage :** `crisp-etape3-api-credentials.png`

---

### Capture 4 : App Directory Crisp (si plugin publié)
**Où :** https://marketplace.crisp.chat  
**Action :** Trouver le plugin WinBack dans le marketplace  
**Éléments à capturer :**
- Fiche plugin avec logo, nom, description
- Bouton "Install" ou "Configure"

**Nommage :** `crisp-etape4-marketplace-listing.png`

---

### Capture 5 : Formulaire WinBack (connexion automatique ou manuelle)
**Où :** Interface WinBack  
**Action :** Page de connexion Crisp  
**Éléments à capturer :**
- Si OAuth Marketplace : bouton "Connecter Crisp"
- Si manuel : champs Identifier / Key
- Message de succès après connexion

**Nommage :** `crisp-etape5-formulaire-winback.png`

---

## 6. ZENDESK — 4 captures à réaliser

### Capture 1 : Admin Center → Apps and integrations → APIs
**Où :** Zendesk Admin Center → Apps and integrations → APIs → Zendesk API  
**Action :** Naviguer vers la section API  
**Éléments à capturer :**
- Menu "Apps and integrations"
- Sous-menu "Zendesk API" sélectionné

**Nommage :** `zendesk-etape1-menu-api.png`

---

### Capture 2 : Onglet "API tokens"
**Où :** Section Zendesk API → Onglet "API tokens"  
**Action :** Afficher la liste des tokens  
**Éléments à capturer :**
- Onglet "API tokens" actif
- Liste des tokens existants (si présents)
- Bouton "Add API token"

**Nommage :** `zendesk-etape2-api-tokens-list.png`

---

### Capture 3 : Formulaire de création de token
**Où :** Clic sur "Add API token"  
**Action :** Créer un nouveau token  
**Éléments à capturer :**
- Champ "Token description" : saisir "WinBack Agent"
- Bouton "Create"
- Pop-up affichant le token (flouter le token réel)
- Message "Save this token now — you won't see it again"

**Nommage :** `zendesk-etape3-create-token.png`

---

### Capture 4 : Formulaire WinBack
**Où :** Interface WinBack  
**Action :** Formulaire de connexion Zendesk  
**Éléments à capturer :**
- Champ "Sous-domaine Zendesk" (ex: `macompany`)
- Champ "Email du compte"
- Champ "API token"
- Bouton "Tester la connexion"

**Nommage :** `zendesk-etape4-formulaire-winback.png`

---

## 7. FRESHDESK — 4 captures à réaliser

### Capture 1 : Avatar → Profile Settings
**Où :** Back-office Freshdesk → Clic sur l'avatar (coin supérieur droit)  
**Action :** Ouvrir le menu utilisateur  
**Éléments à capturer :**
- Avatar cliqué
- Menu déroulant avec "Profile Settings" visible

**Nommage :** `freshdesk-etape1-profile-menu.png`

---

### Capture 2 : Section "Your API Key"
**Où :** Profile Settings → Section "Your API Key"  
**Action :** Localiser la section API Key  
**Éléments à capturer :**
- Titre "Your API Key"
- Bouton "View API Key" ou "Show"

**Nommage :** `freshdesk-etape2-api-key-section.png`

---

### Capture 3 : Clé API visible
**Où :** Après clic sur "View API Key"  
**Action :** Afficher la clé  
**Éléments à capturer :**
- Clé API (floutée si nécessaire)
- Note "Use this key to authenticate API requests"
- Icône de copie

**Nommage :** `freshdesk-etape3-api-key-visible.png`

---

### Capture 4 : Formulaire WinBack
**Où :** Interface WinBack  
**Action :** Formulaire de connexion Freshdesk  
**Éléments à capturer :**
- Champ "Domaine Freshdesk" (ex: `votre-domaine.freshdesk.com`)
- Champ "Clé API"
- Bouton "Tester la connexion"

**Nommage :** `freshdesk-etape4-formulaire-winback.png`

---

## 8. WOOCOMMERCE — 5 captures à réaliser

### Capture 1 : Menu WooCommerce → Settings → Advanced → REST API
**Où :** Back-office WordPress → WooCommerce → Settings → Advanced → REST API  
**Action :** Naviguer vers la section REST API  
**Éléments à capturer :**
- Menu "WooCommerce" → "Settings"
- Onglet "Advanced"
- Sous-section "REST API" sélectionnée

**Nommage :** `woocommerce-etape1-menu-rest-api.png`

---

### Capture 2 : Liste des clés API
**Où :** Section REST API  
**Action :** Afficher la liste des clés existantes  
**Éléments à capturer :**
- Tableau avec colonnes : Description, Consumer Key, User, Permissions, Last Access
- Bouton "Add key" ou "Create an API key"

**Nommage :** `woocommerce-etape2-keys-list.png`

---

### Capture 3 : Formulaire "Key Details"
**Où :** Clic sur "Add key"  
**Action :** Remplir le formulaire de création de clé  
**Éléments à capturer :**
- Champ "Description" : saisir "WinBack Agent"
- Dropdown "User" : sélectionner un utilisateur (ex: compte technique)
- Dropdown "Permissions" : sélectionner "Read" ou "Read/Write"
- Bouton "Generate API key"

**Nommage :** `woocommerce-etape3-key-details-form.png`

---

### Capture 4 : Écran de confirmation avec Consumer Key/Secret
**Où :** Après génération de la clé  
**Action :** Afficher les credentials  
**Éléments à capturer :**
- **Consumer Key** (flouter partiellement)
- **Consumer Secret** (flouter partiellement)
- QR code (optionnel)
- Message "Make sure to copy your new keys now. You won't be able to see them again."
- Bouton "Revoke key"

**Nommage :** `woocommerce-etape4-keys-generated.png`

---

### Capture 5 : Formulaire WinBack
**Où :** Interface WinBack  
**Action :** Formulaire de connexion WooCommerce  
**Éléments à capturer :**
- Champ "URL de la boutique" (ex: `https://ma-boutique.com`)
- Champ "Consumer Key"
- Champ "Consumer Secret"
- Bouton "Tester la connexion"

**Nommage :** `woocommerce-etape5-formulaire-winback.png`

---

## Récapitulatif : nombre de captures par intégration

| Intégration | Nombre de captures | Priorité |
|-------------|-------------------|----------|
| Gorgias | 3 | P1 |
| Shopify | 4 | P1 |
| PrestaShop | 5 | P1 |
| iAdvize | 2 | P2 (Bêta) |
| Crisp | 5 | P2 |
| Zendesk | 4 | P3 |
| Freshdesk | 4 | P3 |
| WooCommerce | 5 | P3 |
| **TOTAL** | **32 captures** | — |

---

## Conseils de production

### Qualité des captures
- Utiliser un environnement de **staging/dev** propre (pas de données client réelles)
- Masquer ou flouter les informations sensibles (clés API, emails, noms de clients)
- Utiliser des noms génériques : "exemple.com", "test@example.com"

### Annotations
- Encadrer en **rouge** les boutons/champs clés
- Ajouter des flèches ou numéros d'étape si nécessaire
- Utiliser un outil comme Snagit, Cleanshot X, ou Figma pour annoter

### Cohérence visuelle
- Taille des captures : uniformiser (ex: 1600x1000 max)
- Compression : optimiser pour le web (PNG 8-bit ou JPG qualité 85%)
- Nommage strict selon le pattern fourni

---

**Document généré le 20 mars 2026**  
**Version 1.0**  
**© CoYia - WinBack Agent**
