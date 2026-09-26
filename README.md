# CoY · Winback Agent

Application Next.js 16 + React 19 + TypeScript + Prisma + Supabase pour détecter les clients à risque et orchestrer les actions de récupération.

## Guides d'exploitation

- [`SETUP-AND-LAUNCH-GUIDE.md`](./SETUP-AND-LAUNCH-GUIDE.md) : installation exacte,
  variables, fournisseurs, jobs, déploiement, staging, vérification et dépannage.
- [`OWNER-GUIDE.md`](./OWNER-GUIDE.md) : vue non technique des comptes, coûts, accès,
  contrôles de santé et blocages avant mise en production.

> **Statut réel :** le lint, le typage, les tests ciblés et le build passent. Utilisez des comptes sandbox jusqu'à ce que l'équipe ait configuré les fournisseurs, exécuté le scénario staging et signé la checklist de lancement des guides.

## Prérequis

- Node.js **24.x** (voir `.nvmrc`)
- npm

## 1. Créer un projet Supabase gratuit

Sur [supabase.com](https://supabase.com), créez un nouveau projet (plan gratuit suffit) et
récupérez :

- `DATABASE_URL` : connexion via le **pooler** (port 6543, avec `?pgbouncer=true`)
- `DIRECT_URL` : connexion **directe** (port 5432, sans pooler) — nécessaire pour les migrations
  Prisma et les jobs Trigger.dev

## 2. Configurer l'authentification Supabase

Dans le dashboard Supabase → **Authentication → URL Configuration** :

- **Site URL** : `http://localhost:3000`
- **Redirect URLs** : `http://localhost:3000/**`

## 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Remplissez les variables requises pour les fonctions que vous testez, en suivant le tableau détaillé du guide. Pour les secrets locaux (`ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`, etc.), générez des valeurs distinctes avec :

```bash
openssl rand -hex 32
```

## 4. Installation et lancement

```bash
npm ci
npx prisma migrate deploy
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

L'application est disponible sur `http://localhost:3000`.

## 5. Créer un compte

Rendez-vous sur `/register` pour créer votre compte de test.

## 6. Configurer Stripe (optionnel)

Pour tester le flux de facturation avec vos propres clés Stripe **test** :

```bash
npm run stripe:setup
```

## Notes importantes

- **Intégrations tierces** (Shopify, Gorgias, PrestaShop et Brevo) : connecter une vraie
  boutique ou un vrai helpdesk nécessite vos propres comptes développeur sur ces plateformes.
  Les connecteurs Crisp et WooCommerce restent différés et ne sont pas proposés dans l'interface.
- **Captures d'écran d'onboarding** : les guides d'intégration Shopify et Crisp ne contiennent
  pas leurs captures d'écran d'origine (identifiants de compte réels visibles dans les images
  sources) — l'intégration elle-même reste fonctionnelle et testable, seule l'illustration
  visuelle du guide est absente.
- **Module PrestaShop** : le lien de téléchargement du module PrestaShop (`/downloads/...`)
  n'est pas fonctionnel dans cette copie — le module PrestaShop lui-même est hors périmètre de
  cette évaluation.
- **RLS PostgreSQL** : non activé, aligné sur l'état réel de l'application en production (pas
  une régression de cette copie).
- **Documentation** : `docs/` contient un extrait des spécifications fonctionnelles (modules,
  intégrations, architecture) utile pour comprendre le contexte métier.

## Stack technique

- Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- Prisma 6 + PostgreSQL (Supabase)
- Supabase Auth
- Stripe (billing)
- Mistral AI (scoring et génération de contenu)
- Trigger.dev v4 (jobs asynchrones)
- Brevo (email/SMS transactionnel)
