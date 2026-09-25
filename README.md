# CoY · Winback Agent — Dépôt d'évaluation développeur

Ce dépôt contient une copie du code réel de l'espace client CoY (Next.js 16 + React 19 +
TypeScript + Prisma + Supabase), destinée à une évaluation technique. Il n'a pas d'historique
Git — c'est un instantané du code, pas un clone du dépôt de production.

## Guides d'exploitation

- [`SETUP-AND-LAUNCH-GUIDE.md`](./SETUP-AND-LAUNCH-GUIDE.md) : installation exacte,
  variables, fournisseurs, jobs, déploiement, staging, vérification et dépannage.
- [`OWNER-GUIDE.md`](./OWNER-GUIDE.md) : vue non technique des comptes, coûts, accès,
  contrôles de santé et blocages avant mise en production.

> **Statut réel :** utilisable en développement/staging avec des comptes sandbox. Ne pas
> traiter de vrais consommateurs avant la fermeture des blocages de confidentialité Shopify,
> d'opt-out SMS, de tests/monitoring et de sécurité des dépendances détaillés dans les guides.

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

Remplissez au minimum les variables marquées **bloquantes au démarrage** et **requises pour
builder** dans `.env.example`. Pour les secrets locaux (`ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`,
etc.), générez des valeurs avec :

```bash
openssl rand -hex 32
```

## 4. Installation et lancement

```bash
npm install
npx prisma migrate deploy
npm run build   # valide aussi les routes OAuth qui lisent leurs variables au chargement
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

- **Intégrations tierces** (Shopify, Gorgias, PrestaShop, Crisp, Brevo) : connecter une vraie
  boutique ou un vrai helpdesk nécessite vos propres comptes développeur sur ces plateformes.
  Le code des intégrations est fonctionnel et testable même sans connexion réelle.
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
