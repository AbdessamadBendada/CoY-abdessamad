# CoY setup and launch guide

This guide describes the code in this repository as it exists on 26 September 2026. It is the runbook for a developer or technical operator. `OWNER-GUIDE.md` is the shorter non-technical companion.

## Read this before launch

CoY builds, has focused automated safety tests, serves every public route and can be exercised with sandbox accounts. It still needs owner-supplied services and a full staging rehearsal before real-customer production traffic:

- Shopify customer and shop redaction are implemented. Customer data requests are verified, matched, audited and reported to the operations/owner mailbox, but a named human privacy owner must still provide requested data to the merchant within the applicable deadline. Legal/privacy review remains mandatory before App Store submission.
- PrestaShop works through Webservice polling and no longer presents a missing module download. The first poll imports only orders created during the previous 30 minutes; it is not a historical import or a real-time webhook flow.
- WooCommerce code exists, but WooCommerce is in `DEFERRED_INTEGRATIONS` and is not shown on the Integrations page. It is not owner-usable without a code change and a new deployment.
- Brevo SMS delivery, unsubscribe and STOP-reply events are handled, but production SMS still requires a controlled carrier/Brevo test in the target country before activation.
- The repository now has focused integration-safety tests, but not a full browser/end-to-end suite, and no dedicated error-monitoring service such as Sentry. The staging scenario below is still required.
- `npm audit --omit=dev` still reports three high-severity findings in the Prisma/config toolchain (`prisma`, `@prisma/config`, `deepmerge-ts`). The directly exploitable Next.js and Trigger `ws` findings found during this review were patched in `package-lock.json`; the remaining Prisma fix offered by npm is a breaking forced change and needs a tested upstream-compatible upgrade.

Use only fake customers, development stores, test email addresses, test phone numbers and Stripe test mode until these items have been resolved.

## 1. What the application needs

| Service | What CoY uses it for | Required? | Account / values needed |
|---|---|---|---|
| Node.js 24 and npm | Builds and runs Next.js, Prisma and the Trigger.dev CLI | Required | Install Node 24; `.nvmrc` contains `24` |
| Supabase | PostgreSQL database and email/password authentication | Required | Create one project per environment at <https://supabase.com/dashboard>; project URL, anon key, transaction and session/direct database URLs |
| Vercel | Hosts the Next.js application and API/webhook routes | Required for the documented production architecture | Create at <https://vercel.com>; connect the Git repository and domain |
| Trigger.dev v4 | Runs scheduled imports, scoring, message sending and maintenance | Required for automatic processing | Create at <https://cloud.trigger.dev>; project ref and environment key |
| Stripe | CoY subscription checkout, invoices and billing status | Required for paid plans; optional for basic local UI work | Create at <https://dashboard.stripe.com>; secret key, webhook secret and recurring price ID |
| Mistral AI | Churn scoring, timing, message generation and moderation | Required for AI workflows | Create at <https://console.mistral.ai>; API key with billing/limits enabled |
| Brevo | Transactional email, SMS and email delivery/open/click/unsubscribe events | Required before sending | Create at <https://app.brevo.com>; API key, verified email sender/domain, SMS sender and webhook |
| Shopify Dev Dashboard | OAuth installation and order/customer webhooks | Required only if Shopify is offered | Create an app at <https://dev.shopify.com/dashboard>; client ID and secret |
| Gorgias developer app | OAuth and support-ticket webhooks | Required only when Gorgias is offered; blank credentials no longer break the build | Create a developer app through Gorgias; client ID and secret |
| Langfuse EU | Traces Mistral calls | Optional, recommended in staging/production | Create at <https://cloud.langfuse.com>; public key, secret key and EU base URL |
| Upstash Redis | Distributed rate limiting helper | Optional | Create at <https://console.upstash.com>; REST URL and token |
| Crisp plugin credentials | Deferred chat integration | Optional and hidden in the current UI | Plugin identifier and key; leave blank unless a developer re-enables Crisp |

No Stripe publishable key, Anthropic key, n8n instance, separate worker server or local Redis process is used by the final code. A server-only Supabase service-role key is required solely to remove a newly created Auth user when registration cannot create its tenant record.

## 2. Exact environment variables

Copy `.env.example`; it contains only variables used by application code, framework configuration or the documented CLIs. Never commit `.env.local`.

### Application, database and private secrets

| Variable | Used for / where obtained | Requirement and environments |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical origin used in OAuth callbacks, Stripe redirects, unsubscribe links, emails and internal job HTTP calls. Set it to `http://localhost:3000` locally and the fixed HTTPS origin in staging/production. | Required everywhere. It is public and embedded at build time. No trailing slash. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL. | Required everywhere. Use a different Supabase project in local/staging/production. Public value. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/publishable key. | Required everywhere. Use the key belonging to that environment's project. Public by design. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API Keys → service role/secret key. It is used only by server-side registration rollback when tenant creation fails after Auth signup. | Required wherever registration is enabled. **Server-only secret:** never prefix with `NEXT_PUBLIC_`, expose to the browser, or place in Trigger.dev unless a task explicitly needs it. Different per Supabase project/environment. |
| `DATABASE_URL` | Prisma request connection. Copy Supabase's transaction pooler URL on port `6543` and append `?pgbouncer=true` (or `&pgbouncer=true`). | Required everywhere. Secret. Different database and password in each environment. |
| `DIRECT_URL` | Jobs and Prisma's direct/session connection. Copy Supabase's session pooler URL on port `5432`; direct IPv6 URL also works where reachable. | Required everywhere. Secret. Different per environment. Trigger.dev must receive it too. |
| `ENCRYPTION_KEY` | AES-256-GCM encryption for stored integration credentials. Generate with `openssl rand -hex 32`. | Required wherever integrations are connected. **Never change it after credentials have been stored** unless a migration re-encrypts them. Unique per environment. |
| `OAUTH_STATE_SECRET` | Signs Shopify and Gorgias OAuth state. Generate with `openssl rand -hex 32`. | Required when OAuth integrations are used. Secret and unique per environment. |
| `SCORING_API_KEY` | Bearer credential used by background jobs to call `/api/v1/actions/generate` and `/api/v1/scoring`. Generate with `openssl rand -hex 32`. | Required for automated scoring/action generation. Same value in Vercel and Trigger.dev for one environment; different between environments. |
| `CRON_SECRET` | Bearer credential for manual `/api/cron/*` endpoints. Generate with `openssl rand -hex 32`. | Required if manual cron endpoints are used. Secret and unique per environment. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Next.js Server Actions encryption key. Generate with `openssl rand -base64 32`. | Required for stable multi-instance deployments. Secret and unique per environment. Keep stable across all instances of one environment. |

Do not set `NODE_ENV`; Next.js sets it. Vercel injects `VERCEL_DEPLOYMENT_ID` when system variables are exposed. Neither belongs in `.env.local`.

### Billing, messaging and AI

| Variable | Used for / where obtained | Requirement and environments |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Developers → API keys. | Required for billing. Use `sk_test_...` in local/staging and `sk_live_...` only in production. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the exact endpoint `/api/webhooks/stripe`. For local Stripe CLI this is printed by `stripe listen`; hosted environments use the Dashboard endpoint secret. | Required for billing updates. Every endpoint/environment has a different `whsec_...`. |
| `STRIPE_PRICE_COY_MONTHLY` | Recurring EUR price for CoY at €899/month; `npm run stripe:setup` creates/fetches it. | Required for Checkout. A test price must be paired with test keys; live price with live keys. |
| `MISTRAL_API_KEY` | Mistral console API key. The code calls `mistral-large-latest` and `mistral-small-latest`. | Required for scoring/generation. Use separate keys or projects/limits for staging and production. |
| `BREVO_API_KEY` | Brevo SMTP & API → API Keys. | Required before email/SMS. Use a restricted test account/subaccount where possible. Do not use a customer-sending production key locally. |
| `BREVO_SENDER_EMAIL` | A sender address or domain verified in Brevo. | Required for reliable email. Use a controlled test sender in local/staging and the production domain only in production. |
| `BREVO_SMS_SENDER` | Sender label sent to Brevo's transactional SMS API. | Required only for SMS. Approval/format varies by destination country. |
| `BREVO_WEBHOOK_SECRET` | A random secret placed in the Brevo webhook query string. Generate with `openssl rand -hex 32`. | Required for email tracking/unsubscribe events. Unique per environment. |
| `INTERNAL_ALERT_EMAIL` | Controlled operations mailbox receiving critical security and selected Stripe/Shopify alerts. | Optional in code; strongly recommended in staging/production. |
| `LANGFUSE_PUBLIC_KEY` | Langfuse project public key. | Optional. Set together with the next two values. |
| `LANGFUSE_SECRET_KEY` | Langfuse project secret. | Optional secret; different project per environment. |
| `LANGFUSE_BASE_URL` | Langfuse host. The code defaults to `https://eu.cloud.langfuse.com`. | Optional; use `https://eu.cloud.langfuse.com` for the EU cloud project. |

### Integrations, jobs and diagnostics

| Variable | Used for / where obtained | Requirement and environments |
|---|---|---|
| `SHOPIFY_CLIENT_ID` | Shopify app Credentials page. | Required to offer Shopify. Use separate development/staging and production apps. |
| `SHOPIFY_CLIENT_SECRET` | Shopify app secret; also verifies Shopify webhooks. | Required to offer Shopify. Secret and environment-specific. |
| `GORGIAS_CLIENT_ID` | Gorgias OAuth app credentials. | Required for Gorgias OAuth; optional if Gorgias is not offered. Use separate test/production apps. |
| `GORGIAS_CLIENT_SECRET` | Gorgias OAuth token exchange. | Required for Gorgias OAuth; optional otherwise. Secret and environment-specific. |
| `TRIGGER_PROJECT_REF` | Trigger.dev Project Settings → Project ref (`proj_...`). | Required for tasks. A project may contain DEV/STAGING/PROD environments. |
| `TRIGGER_SECRET_KEY` | Trigger.dev environment API key / CLI authentication. | Required for local dev/deploy. Use the key for the selected environment; never reuse PROD locally. |
| `UPSTASH_REDIS_REST_URL` | Upstash database REST URL. | Optional; set with its token. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash database REST token. | Optional secret; set with its URL. |
| `CRISP_PLUGIN_IDENTIFIER` | Crisp plugin identifier used by the deferred connector. | Optional while Crisp remains hidden. |
| `CRISP_PLUGIN_KEY` | Crisp plugin key used by the deferred connector. | Optional secret while Crisp remains hidden. |
| `ANALYZE` | Enables the bundle analyzer when exactly `true`. | Optional developer-only value; leave `false` normally. |

Secrets that must be different in local, staging and production: database URLs/passwords, Supabase keys/projects, `ENCRYPTION_KEY`, all OAuth/app secrets, `OAUTH_STATE_SECRET`, `SCORING_API_KEY`, `CRON_SECRET`, Server Actions key, Stripe keys/prices/webhook secrets, Brevo keys/webhook secret, Mistral key or project, Trigger key, Langfuse project keys, Upstash credentials and Crisp credentials. Only non-secret labels such as `BREVO_SMS_SENDER` may intentionally match.

## 3. Local setup from zero

### Step 1 — install Node.js 24

Install a Node version manager, then from the project directory run:

```bash
nvm install
nvm use
node --version
```

The final command must start with `v24.`. If `nvm` is not installed, install Node.js 24 from <https://nodejs.org> and reopen Terminal.

### Step 2 — enter the project

```bash
cd "/path/to/coy-refactored"
```

Run `pwd` and confirm it ends in `coy-refactored`. This is the new project; do not run setup commands in the recovered original folder.

### Step 3 — install the locked dependencies

```bash
npm ci
```

Use `npm ci`, not `npm install`, for a reproducible install from `package-lock.json`.

### Step 4 — create local configuration

```bash
cp .env.example .env.local
```

Generate five values and paste each output into the matching field; do not reuse one output for several fields:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 32
```

They correspond to `ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`, `SCORING_API_KEY`, `CRON_SECRET` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. Fill Supabase next. Test-only third-party values can be added as each service is configured.

### Step 5 — create the development database and auth project

1. In Supabase, create a project clearly named `coy-development`.
2. Save its database password in the team's password manager.
3. Open Project Settings → API. Copy Project URL and anon/publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. From the same API Keys page, copy the environment's service-role/secret key into `SUPABASE_SERVICE_ROLE_KEY`. Store it only in `.env.local` locally and server-side Vercel secrets when hosted. Never expose it to browser code.
5. Click **Connect**. Copy the transaction pooler URI (port 6543) into `DATABASE_URL`; ensure it has `pgbouncer=true`.
6. Copy the session pooler URI (port 5432) into `DIRECT_URL`. Use the displayed host and username; do not construct them by hand. Percent-encode reserved characters in the password.
7. Configure authentication using section 5 below.

### Step 6 — apply existing migrations

For a fresh development database, the safest non-destructive command is:

```bash
npx prisma migrate deploy
npx prisma generate
```

There is no seed script in this repository. Register through the UI to create the first tenant/user.

### Step 7 — add sandbox providers

Configure Stripe test mode, Mistral, Brevo test recipients, Shopify development app, Gorgias test app and Trigger.dev DEV using the later sections. Basic pages and authentication can be tested before every optional integration is connected, but AI, billing, messages and scheduled jobs will not work without their provider.

### Step 8 — start the local Trigger.dev worker

In a second Terminal window, from the same directory:

```bash
npm run trigger:dev
```

Sign in if the CLI asks. Keep this process running. Confirm the ten task IDs listed in section 12 appear in the Trigger.dev DEV dashboard.

### Step 9 — validate and start Next.js

In the first Terminal:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Open <http://localhost:3000>. Never use production provider keys for this check.
Also run `npm audit --omit=dev`; do not launch if new critical findings appear, and have the technical lead assess all remaining high findings.

### Step 10 — create the first test tenant

Open `/register`, use an inbox you control, confirm the Supabase email and sign in. Expected result: `/overview` opens and Supabase Table Editor shows one row in `tenants`, one in `users`, and one monthly row in `quota_usages`.

## 4. Database setup and safety

CoY uses the same Supabase project for Supabase Auth and PostgreSQL. Browser/server auth uses the public project URL and anon key. Prisma uses `DATABASE_URL`; Trigger.dev jobs use `DIRECT_URL` through `createJobsClient()`.

### Development commands

Apply committed migrations without deleting data:

```bash
npx prisma migrate deploy
```

After intentionally editing `prisma/schema.prisma`, create a new migration only against development:

```bash
npx prisma migrate dev --name describe_the_change
```

Inspect development data:

```bash
npx prisma studio
```

Reset development only:

```bash
npx prisma migrate reset
```

**DANGER:** `migrate reset` deletes every application table and all application data in the selected database. Verify `DATABASE_URL` contains the development project ref before typing `y`. There is no automatic seed afterward.

### Production commands

1. Take/verify a Supabase backup.
2. Test the exact migration on staging.
3. Set the shell/CI environment to production without copying secrets into a file.
4. Confirm the hostname/project ref aloud with a second person.
5. Run only:

```bash
npx prisma migrate deploy
```

6. Check Supabase Database logs and `npx prisma migrate status`.

Never run `prisma migrate dev`, `prisma migrate reset`, `prisma db push --force-reset`, ad-hoc delete SQL or the Stripe setup script with a live key as an experiment against production.

Supabase backups must be enabled and restore-tested before real data is accepted. RLS is not enabled on the application tables in this snapshot; all tenant isolation is enforced by server code. That makes server credentials and IDOR tests especially important.

## 5. Authentication setup

The application implements email/password signup, email confirmation, login, logout and password reset through Supabase. It does not implement social login or MFA UI.

For each Supabase project:

1. Open Authentication → Providers → Email.
2. Enable email/password sign-in and **Confirm email**.
3. Keep anonymous sign-ins disabled.
4. Open Authentication → URL Configuration.
5. Set **Site URL** to the environment's fixed URL:
   - local: `http://localhost:3000`
   - staging: `https://staging.example.com`
   - production: `https://app.example.com`
6. Add these Redirect URLs for that same origin:
   - `ORIGIN/auth/callback`
   - `ORIGIN/auth/callback?next=/reset-password`
   - `ORIGIN/auth/confirm`
   Using `ORIGIN/**` is convenient only for local development; use exact URLs in hosted environments.
7. Configure Supabase custom SMTP for staging/production so confirmation/reset mail does not depend on the shared test sender. This is separate from Brevo application messaging; it may use Brevo SMTP if desired.
8. Edit email templates only if their link still targets the callback/confirm routes above.

Test signup, confirmation, normal login, “forgot password”, reset and logout. MFA is not implemented: enabling mandatory MFA in Supabase would strand users until application UI and assurance-level checks are added.

## 6. Shopify setup

The current app is a standalone/API-style app using Shopify's authorization-code grant. It is not a Shopify CLI embedded app.

### Create one Shopify app per hosted environment

1. In the Shopify Dev Dashboard, create an app and a development store.
2. Set the App URL to the environment origin, for example `https://staging.example.com`.
3. Add the allowed redirect URL `https://staging.example.com/api/shopify/oauth/callback`.
4. Configure the exact least-privilege scopes requested by code: `read_orders,read_customers`.
5. Copy the client ID to `SHOPIFY_CLIENT_ID` and secret to `SHOPIFY_CLIENT_SECRET` in Vercel and Trigger.dev for that environment.
6. Ensure `NEXT_PUBLIC_APP_URL` is the same origin. Redeploy after changing it.

For local OAuth/webhooks, use a stable public HTTPS tunnel. Set `NEXT_PUBLIC_APP_URL` and the app/redirect URLs to that tunnel origin, restart Next.js, and do not use a tunnel connected to production secrets.

### Install and verify

1. Sign in to CoY and open `/integrations`.
2. Select Shopify and enter the full `store-name.myshopify.com` domain.
3. Approve the requested scopes in the development store.
4. CoY stores the offline access token encrypted and automatically attempts to register these webhooks against `/api/webhooks/shopify?integrationId=...`: `orders/create`, `orders/updated`, `customers/update`, `app/scopes_update`.
5. Create a fake customer and order in the development store. Check CoY `/customers`, Supabase `customers`/`orders`, and Vercel logs for `[webhook/shopify]`.

Important limitations:

- There is no Shopify bulk/historical import. Only future registered webhook events populate data.
- Webhook registration is fire-and-forget; OAuth can show “connected” even if registration failed. Verify subscriptions/deliveries in Shopify and check Vercel logs after installation.
- Disconnecting in CoY only changes the database status; it does not currently revoke the Shopify token or delete Shopify webhook subscriptions.

### Mandatory privacy webhooks

Configure these HTTPS destinations in the Shopify app:

- `customers/data_request` → `ORIGIN/api/webhooks/shopify/customers-data-request`
- `customers/redact` → `ORIGIN/api/webhooks/shopify/customers-redact`
- `shop/redact` → `ORIGIN/api/webhooks/shopify/shop-redact`

The final routes reject invalid HMAC signatures with 401. `customers/redact` hard-deletes the matched Shopify customer and cascades its orders, actions, conversations/messages and CSAT records. `shop/redact` deletes all customers sourced from that Shopify integration and then deletes the encrypted integration token. The CoY tenant and invoices remain because they belong to the merchant account and may have separate billing/legal retention duties. `customers/data_request` matches the customer, writes a PII-free audit record and alerts `INTERNAL_ALERT_EMAIL` (or the tenant OWNER when that address is blank); a named privacy operator must then provide the actual data to the merchant within the applicable deadline.

Before App Store submission, test all three endpoints with Shopify CLI against staging, inspect the audit logs and deleted rows, and have privacy/legal approve the export, deletion and retention procedure. Shopify also requires protected-customer-data approval, a privacy policy, support contact, listing assets, app review and the other human/legal declarations in the Dev Dashboard. Current official privacy requirements: <https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance>.

Values that change per environment: app/client ID, client secret, app URL, redirect URL, privacy webhook URLs, development store and every stored access token.

## 7. WooCommerce setup

**Current status: deferred.** The REST polling and webhook receiver are implemented, but `src/lib/config/active-integrations.ts` hides WooCommerce from the live Integrations page. Do not promise this connector or configure a production merchant until a developer moves `WOOCOMMERCE` into `ACTIVE_INTEGRATIONS`, redeploys and completes the end-to-end test.

Once explicitly enabled in a test deployment:

1. Use a WooCommerce sandbox with HTTPS and non-plain WordPress permalinks.
2. In WP Admin go to WooCommerce → Settings → Advanced → REST API → Add key.
3. Description: `CoY staging`; select a dedicated user and **Read** permission. The code only GETs orders. Copy the one-time Consumer Key and Consumer Secret.
4. In CoY `/integrations`, enter the site origin, key and secret. CoY calls `/wp-json/wc/v3/orders?per_page=1` to test it and displays a one-time webhook secret.
5. In WooCommerce → Settings → Advanced → Webhooks, create two active webhooks: **Order created** and **Order updated**.
6. For both, use `ORIGIN/api/webhooks/woocommerce?integrationId=THE_ID_SHOWN_BY_COY` as Delivery URL and paste CoY's generated secret.
7. Create a fake order with a controlled email. Expected within seconds via webhook, or within 30 minutes through polling: customer/order rows appear and the CoY integration's last-sync time updates.

The polling task queries orders modified since `lastSyncAt`, paginates 100 per page and runs every 30 minutes. WooCommerce signs webhook bodies with `X-WC-Webhook-Signature`; CoY verifies it. WooCommerce may disable a webhook after repeated non-2xx deliveries, so check its delivery logs. Official navigation: <https://woocommerce.com/document/configuring-woocommerce-settings/advanced/>.

## 8. PrestaShop setup

PrestaShop is visible and connects with a Webservice API key.

1. Use a test store reachable over valid public HTTPS.
2. In the PrestaShop back office, open Advanced Parameters → Webservice and enable the webservice.
3. Add a key named `CoY staging`, active, with GET permission on **orders** and **customers**. Those are the only resources the current polling code reads.
4. In CoY `/integrations`, choose PrestaShop and enter the store origin such as `https://shop.example.test` plus the key. CoY tests `GET /api/?output_format=JSON` using Basic auth.
5. Trigger `sync-prestashop` from the Trigger.dev DEV/STAGING dashboard, or wait up to 30 minutes.
6. Create a fake order less than 30 minutes old. Check `/customers`, Supabase `customers`/`orders`, Trigger.dev run output and the integration's `lastSyncAt`.

The poll calls `/api/orders` filtered by `date_add`, then `/api/customers/{id}`. On the first run it looks back only 30 minutes. It does not bulk import historical orders, returns or messages, and this repository does not include a PrestaShop real-time webhook module. Treat polling as the only available path and do not claim complete historical import.

## 9. Stripe setup

### Test mode first

1. Enable **Test mode** in Stripe.
2. Put the test `sk_test_...` key in local `.env.local`.
3. Run:

```bash
npm run stripe:setup
```

The idempotent script creates/fetches one product, “CoY — l'agent Winback de CoYia”, and one recurring EUR price of €899/month. It writes `STRIPE_PRICE_COY_MONTHLY` into `.env.local`. Checkout also applies a 21-day trial. The code adds a €490 one-time setup invoice item for monthly CoY subscriptions when billing activates.

4. For local webhooks, install the Stripe CLI, sign in, then run in another terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` to `STRIPE_WEBHOOK_SECRET` and restart Next.js.
5. For staging, add `https://staging.example.com/api/webhooks/stripe` in Stripe Workbench/Developers → Webhooks and select exactly:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
6. Sign the DPA in a fake tenant, start Checkout and use Stripe's test card `4242 4242 4242 4242`, any future expiry/CVC and a test billing identity.
7. Check Stripe Events returns 2xx, the tenant gains `stripeCustomerId`/`stripeSubscriptionId`, and status/billing UI updates.

There is no customer-portal session in this codebase. Subscription management beyond Checkout and webhook-driven status must be handled in Stripe Dashboard until a portal feature is implemented.

### Switch to live safely

1. Complete Stripe business verification, statement descriptor, support details, tax/invoice settings and legal review.
2. Turn on live mode and use a separate deployment/environment.
3. Set `STRIPE_SECRET_KEY` to `sk_live_...`.
4. Run `npm run stripe:setup` only after reviewing its €899/month amount and accepting its five-second live warning; record the resulting live price ID.
5. Create the production webhook endpoint and record its distinct live `whsec_...`.
6. Verify all three values are live values. Never pair a test key, live price or wrong endpoint secret.
7. Make one controlled real payment approved by the owner, then refund/cancel it according to the test plan. Never use a real customer's card.

## 10. Email and SMS setup

CoY uses Brevo directly through its HTTP API; it does not use SMTP for win-back messages.

1. Create the Brevo account/subaccount for the environment.
2. Authenticate a sending domain and add the required DNS records. Set `BREVO_SENDER_EMAIL` to a verified address on that domain.
3. Create an API key with only the permissions needed for transactional email/SMS and store it as `BREVO_API_KEY`.
4. Configure an approved `BREVO_SMS_SENDER` if SMS is being tested.
5. Generate `BREVO_WEBHOOK_SECRET` and create a transactional webhook pointing to:
   `ORIGIN/api/webhooks/brevo?secret=THE_SECRET`
6. Subscribe the email webhook to delivered, opened, clicked and unsubscribe. CoY also accepts Brevo SMS callbacks sent through the `webUrl` attached to every SMS: delivered, replied, unsubscribed and hard-bounce/rejected events.
7. Add only controlled team addresses/numbers as test recipients. Create/generate a CoY action and send one email. Verify the Action status progresses from SENT to OPENED/CLICKED when the webhook is delivered.
8. Open the generated `/optout/<token>` link. Verify the test customer gets `optedOutAt` and cannot receive another action.

Do not use a purchased list or a real customer during setup. SMS uses Brevo's current `/v3/transactionalSMS/send` endpoint. CoY rejects outgoing SMS unless it contains `STOP`; Brevo `unsubscribed` events and replies equal to `STOP`, `ARRET`, `ARRÊT`, `DESABONNER` or `DÉSABONNER` permanently opt the matched customer out. Test this with one team-controlled number in staging and confirm `customers.optedOutAt` is set before enabling production SMS. Country/carrier rules and sender approval remain the owner's responsibility.

## 11. AI configuration

Create a Mistral workspace/key, enable billing and set a conservative spend/rate limit. CoY uses:

- `mistral-large-latest` for churn scoring, action generation and moderation;
- `mistral-small-latest` for send-timing decisions.

AI is invoked by daily scoring, Gorgias/Crisp conversation processing, action generation, scheduled-send regeneration/moderation and scenario previews. The generate route permits at most 10 recently created actions per tenant per minute; manual sending separately limits 30 sends/hour/tenant. Provider rate limits can still be lower.

Safe check: use a fake customer/order, manually trigger `score-customers` in Trigger.dev DEV, and verify `customers.churnScore`, `churnRisk`, `lastScoredAt`, `scoringDetails.aiModelUsed` and a `SCORING_COMPLETED` audit log. Then generate a draft action and review it without sending.

For Langfuse, create a separate EU project per environment and set all three Langfuse variables. Traces are flushed for every call. Confirm scoring/timing/generation/moderation traces appear and review their data-retention/access policy before sending personal data. With the variables blank, AI still works but has no Langfuse trace.

## 12. Background jobs

Production scheduling is Trigger.dev v4. The `/api/cron/*` routes are authenticated manual wrappers for diagnostics; there is no `vercel.json` schedule.

| Task ID / UTC schedule | Trigger and work | Failure/retry/health signal |
|---|---|---|
| `reconcile-sending` — every 5 min | Marks actions stuck in `SENDING` over five minutes as `FAILED` with `SENDING_TIMEOUT`. | Uncaught DB errors make the Trigger run fail; count is in run output. Any count above zero deserves investigation. |
| `sync-prestashop` — every 30 min | Polls active PrestaShop integrations for recent orders/customers. | Per-order errors are counted; HTTP/integration failures may be logged and skipped, so a run can be green with no import. Check logs, count and `lastSyncAt`. |
| `sync-woocommerce` — every 30 min | Polls active WooCommerce integrations; currently none can be added in UI. | Same caveat: failures can be logged while run completes. Check output and `lastSyncAt`. |
| `sync-crisp` — every 30 min | Polls deferred Crisp conversations/messages, scores them and requests actions. | Per-item errors are counted/logged; connector is hidden. |
| `send-scheduled` — hourly | Claims up to 30 due `SCHEDULED` actions, re-generates/moderates and sends through Brevo. | Individual failures become `FAILED` or `CANCELLED`; run output has processed/sent/failed/skipped. Retry a failed action from CoY only after fixing cause. |
| `trigger-winback-actions` — hourly | For each active/trial tenant, selects up to five highest-risk eligible customers and calls CoY's generate API. | Output has triggered/skipped/errors. Requires matching `SCORING_API_KEY` and reachable `NEXT_PUBLIC_APP_URL`. Source comment saying “daily” is stale; cron code is hourly. |
| `cleanup-cooldowns` — daily 03:00 | Clears expired customer cooldown timestamps. | Run output reports cleaned count. |
| `score-customers` — daily 04:00 | Scores up to five eligible customers per tenant who ordered in the last 90 days and were never scored or not scored for seven days. | Per-customer failures are counted but do not fail the whole run. Check `errors`, AI traces and `lastScoredAt`. |
| `trial-emails` — daily 09:00 Europe/Paris | Sends the trial lifecycle email sequence to tenant owners. | Output reports sent/skipped/errors. Requires Brevo. |
| `remind-dpa-signature` — daily 09:00 Europe/Paris | Reminds eligible tenants to sign the DPA. | Output reports sent/skipped/errors. Without Brevo it logs a simulated reminder instead of sending. |

No task sets an explicit retry policy in source. Trigger.dev automatically retries uncaught task failures according to platform defaults, but many jobs deliberately catch item-level errors and return an `errors` count; those successful runs are not retried automatically. This makes the returned counters and logs critical.

### Configure Trigger.dev

1. Create/select a project and copy its `proj_...` into `TRIGGER_PROJECT_REF`.
2. In DEV, run `npm run trigger:dev`; verify all ten tasks register.
3. In each hosted Trigger environment, add at least `DIRECT_URL`, `DATABASE_URL`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, `SCORING_API_KEY`, `MISTRAL_API_KEY`, all Brevo variables, `INTERNAL_ALERT_EMAIL`, and Langfuse variables if enabled. Jobs import shared modules, so matching application configuration is safest.
4. Deploy staging with `npx trigger.dev@latest deploy --env staging` after enabling STAGING for the project.
5. Deploy production with `npm run trigger:deploy` while authenticated to PROD, or use Trigger.dev's Vercel integration and explicitly map Vercel staging/production environments.
6. In each environment, open Runs, execute every task manually using test data, inspect its trace/output and then enable/confirm schedules.

Healthy means recent scheduled runs exist at the expected interval, no recurring exceptions, `errors`/`failed` are zero or explained, integration `lastSyncAt` advances, customer `lastScoredAt` advances and due actions leave `SCHEDULED`.

## 13. Monitoring and operating checks

There is no Sentry/PagerDuty integration. Errors appear in:

- Vercel Project → Logs for Next.js, OAuth, webhook and API errors;
- Trigger.dev → Runs for scheduled jobs and per-run console output/traces;
- Supabase → Logs for database/auth failures and Table Editor for state;
- Stripe → Workbench/Developers → Webhooks → Events for non-2xx deliveries;
- Brevo → Transactional logs and webhook delivery history;
- Shopify/Gorgias/WooCommerce provider webhook delivery logs;
- Langfuse for AI traces when enabled;
- `INTERNAL_ALERT_EMAIL` for critical HMAC/auth events and selected billing/scope alerts only.

The CoY Actions page exposes failed actions and their `failureReason`. The Integrations page shows `lastSyncAt`, but sync jobs currently do not reliably populate `lastError`, so a green/active card alone is not proof of health.

Immediate attention: repeated 401/HMAC failures, Stripe webhook failures, Trigger schedules with no runs, `send-scheduled` failures, a growing `SENDING` count, AI authentication/quota errors, database connection exhaustion, or a privacy request.

Daily checklist:

- Trigger.dev: all expected schedules ran; review non-zero `errors`, `failed`, `skipped` spikes.
- CoY Actions: no unexplained FAILED or actions stuck SCHEDULED/SENDING.
- Stripe and Brevo: no failed webhook burst; delivery/bounce health is normal.
- Integrations: expected stores have recent `lastSyncAt`; Vercel logs have no repeated provider errors.
- Internal alert mailbox: triage every critical/security/payment alert.

Weekly checklist:

- Supabase backup exists and storage/connections are within limits.
- Mistral/Brevo/Stripe/Trigger/Langfuse usage and spend match expectations.
- Test one controlled import, one score and one non-customer draft action.
- Review access lists and remove leavers; rotate exposed credentials, not routinely `ENCRYPTION_KEY`.
- Review failed/bounced messages and unsubscribe/complaint handling.

## 14. Deploying on Vercel

1. Put this refactored snapshot in a new private Git repository. Do not point Vercel at the original CoY production repository.
2. In Vercel, Add New → Project → import the repository. Framework should detect **Next.js**; Root Directory is repository root.
3. Set Node.js to 24.x. `package.json` also requires `>=24.0.0`.
4. Keep Install Command `npm install` (Vercel uses the lockfile), Build Command `npm run build`, Output automatic. There is no custom output directory.
5. Add every required production variable from section 2 in Settings → Environment Variables. Do not add secrets as `NEXT_PUBLIC_*`. Enable automatic System Environment Variables so `VERCEL_DEPLOYMENT_ID` supports skew protection.
6. Deploy first without promoting real traffic. Read the build log and application logs.
7. Attach the production domain and wait for HTTPS/DNS to be valid. Set `NEXT_PUBLIC_APP_URL` to that exact `https://` origin and redeploy.
8. In the production Supabase project, apply `npx prisma migrate deploy`, then configure Site URL and exact auth redirects for the production domain.
9. Configure the production Stripe endpoint/events and its live webhook secret.
10. Configure the production Shopify app URL, OAuth callback and all three privacy endpoints. Do not submit or accept real stores until the staging privacy tests and legal review are signed off.
11. Configure Gorgias callback `https://PRODUCTION_ORIGIN/api/gorgias/oauth/callback` and its production credentials.
12. Configure Brevo's production transactional webhook and verified production sender.
13. Deploy/match the Trigger.dev PROD environment and copy/sync its production variables. Confirm schedules only after safe manual runs.
14. Run the end-to-end scenario below, connect the domain to users only after all applicable checks pass.

Next.js on Vercel requires no separate web server. Trigger.dev, not Vercel Cron, runs schedules. Vercel Preview deployments with random URLs are unsuitable for fixed OAuth/webhook configuration; use a stable staging domain.

## 15. Staging environment

Staging is the rehearsal environment and must never share production customer data or provider credentials.

Create:

- a persistent `staging.example.com` Vercel environment/domain (Vercel custom environments require an eligible plan; otherwise use a separate Vercel project bound to the staging branch);
- a separate Supabase project with backups and synthetic data;
- Stripe test mode product/price/webhook;
- Shopify development app/store and Gorgias sandbox;
- Brevo subaccount/sender limited to allow-listed team recipients;
- separate Mistral spend limit and Langfuse project;
- Trigger.dev STAGING environment mapped to the staging deployment.

Every staging secret must differ from production. Test new migrations on a recent **anonymized/synthetic** dataset, never a raw production copy. Test Shopify scope/callback changes, Stripe webhook changes, AI prompt/model changes and all jobs here. Promote the same commit to production only after the end-to-end checks pass and the migration rollback/restore plan is written.

## 16. First-launch checklist

- [ ] Separate production Supabase project created; backups and restore procedure verified
- [ ] Production migrations applied with `prisma migrate deploy`
- [ ] Signup, confirmation, login, reset and logout work
- [ ] Server-only `SUPABASE_SERVICE_ROLE_KEY` configured and registration rollback tested in development
- [ ] RBAC tested with OWNER, ADMIN and MEMBER accounts
- [ ] Tenant isolation tested with two synthetic tenants
- [ ] Production domain and HTTPS connected; `NEXT_PUBLIC_APP_URL` matches it
- [ ] Shopify OAuth works on a development store
- [ ] Shopify normal webhook subscriptions/deliveries verified
- [ ] Shopify privacy data-request alert, customer redaction and shop redaction verified in staging; human export procedure legally approved
- [ ] Protected customer data access and any App Store review complete
- [ ] PrestaShop polling limitation accepted or historical importer/module implemented
- [ ] WooCommerce either formally remains unavailable or is enabled and fully tested
- [ ] Stripe test Checkout and all five webhook events verified
- [ ] Live Stripe product/price/webhook use only live credentials
- [ ] Mistral scoring, timing, generation and moderation verified on fake data
- [ ] Trigger.dev PROD deployment contains all ten tasks and schedules
- [ ] Imports, scoring, generation, scheduling and reconciliation runs are visible and healthy
- [ ] Brevo sender/domain authenticated; controlled email delivered/tracked
- [ ] Email opt-out tested and blocks another send
- [ ] SMS delivery callback and controlled STOP reply verified before production SMS
- [ ] Failed action and retry path tested
- [ ] Internal alert mailbox received a safe staging test alert
- [ ] Vercel/Trigger/Supabase/Stripe/Brevo monitoring ownership assigned
- [ ] Terms, privacy policy, DPA/subprocessor list and retention rules approved
- [ ] Password-manager vault contains owner-controlled recovery access for every service
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm audit --omit=dev` reviewed successfully
- [ ] No real consumer was used during verification

## 17. Safe end-to-end verification

Perform this in staging with two synthetic tenants, a Shopify development store (or recent PrestaShop fake order), Stripe test mode, team-controlled inbox/phone and no real consumer.

1. **Register Tenant A.** Expected: confirmation email, then `/overview`; check Supabase `tenants/users/quota_usages`. If it fails, inspect Supabase Auth logs, redirect URLs and Vercel logs.
2. **Register Tenant B in another browser profile.** Expected: separate tenant ID and empty dashboard. If A's data is visible, stop immediately: tenant isolation is broken.
3. **Sign Tenant A's DPA and run Stripe test Checkout.** Expected: Stripe event 2xx and tenant billing IDs/status populated. If payment succeeds but status does not change, compare endpoint `whsec`, selected events, event response and metadata.
4. **Connect the Shopify development store.** Expected: ACTIVE integration and encrypted token in config. If OAuth fails, compare exact origin/callback, client ID/secret, cookie/HTTPS and requested scopes.
5. **Verify Shopify webhook subscriptions.** Expected: four normal topics target the integration-specific URL. If absent, reinstall while watching Vercel logs; OAuth success does not prove registration success.
6. **Create a fake customer and order.** Expected: Customer and Order rows appear for Tenant A only. If not, inspect Shopify delivery/HMAC logs. Remember there is no historical import.
7. **Run `score-customers` in Trigger.dev STAGING.** Expected: `scored: 1` (subject to eligibility), customer score fields and Langfuse trace. If zero, the order must be within 90 days and the customer unscored/out of cooldown. If errors, check Mistral key/quota and `DIRECT_URL`.
8. **Run `trigger-winback-actions`.** Expected for a customer above the configured churn threshold: an action is generated/scheduled (maximum five per tenant/run). If skipped, inspect score, cooldown, existing recent actions, quotas, DPA and the generate API response.
9. **Review the action before sending.** Expected: safe content, correct controlled recipient, unsubscribe link for email, and no real PII. Cancel if anything is unexpected.
10. **Send/schedule to the controlled inbox.** Expected: Brevo accepts it and Action becomes SENT; for scheduled actions, run `send-scheduled` or wait for the hourly schedule. If FAILED, inspect `failureReason`, Brevo logs/key/sender and quotas.
11. **Open and click the message.** Expected: Brevo webhook changes action to OPENED/CLICKED. If not, compare `message-id`, webhook URL secret and subscribed Brevo events.
12. **Test opt-out.** Open the email opt-out link. Expected: a confirmation page appears and `customers.optedOutAt` is still empty. Click **Me désinscrire**; only then should `optedOutAt` be set and a second send be rejected/cancelled. With a separate synthetic customer and controlled phone, send one SMS, reply `STOP`, wait for the Brevo callback, and verify the same fields. If SMS does not opt out, check the action's `brevoMessageId`, callback secret, `webUrl` reachability and Brevo SMS event log.
13. **Verify attribution.** Create another test order after the sent action. Expected: applicable attribution logic marks conversion/ROI. If not, inspect order email match, timestamps and webhook processing logs.
14. **Verify isolation/RBAC.** Tenant B must not see A's customer/action; MEMBER must not perform OWNER/ADMIN send/configuration actions. Any leak is a release blocker.
15. **Verify failure visibility.** In staging only, temporarily use an invalid Brevo key for a controlled action, observe FAILED and logs, restore the key and test retry. Never do this in production.
16. **Verify Shopify privacy handling.** Use Shopify CLI to trigger each compliance topic in staging. Expected: invalid HMAC returns 401; data request creates a PII-free audit entry and controlled alert; customer redaction deletes only the synthetic customer's related data; shop redaction deletes Shopify-sourced customers and the integration but retains the CoY merchant account/invoices. Never aim this test at production.
17. **Delete remaining synthetic data according to the staging policy.** Keep the test evidence and audit identifiers, not unnecessary personal data.

## 18. Troubleshooting

### The app/build says an environment variable is missing

- Compare `.env.local` with `.env.example`; no spaces around `=`.
- Gorgias values are checked when its OAuth routes are used, not during build. A Gorgias connection still fails until `GORGIAS_CLIENT_ID`, `GORGIAS_CLIENT_SECRET` and `OAUTH_STATE_SECRET` are set.
- Restart `npm run dev` after changes. Redeploy Vercel after hosted changes; `NEXT_PUBLIC_*` values are fixed at build time.

### Prisma cannot connect or migrations see no `DATABASE_URL`

- Run from repository root; `prisma.config.ts` loads `.env.local`.
- Copy the URLs from Supabase Connect instead of constructing the pooler host.
- Use port 6543 plus `pgbouncer=true` for `DATABASE_URL`, and port 5432 session/direct for `DIRECT_URL`.
- Percent-encode special characters in the password and check Supabase Database logs/network restrictions.

### Signup works in Supabase but CoY reports account creation failed

- CoY now attempts to delete the just-created Auth user automatically if Prisma cannot create the tenant. Inspect Supabase Auth, Vercel logs and the database to confirm the rollback succeeded.
- If the UI/log reports `REGISTRATION_RECOVERY_REQUIRED`, do not retry repeatedly: a technical operator must inspect that synthetic/user record, repair connectivity and remove only the incomplete Auth user after verifying no tenant exists. Never delete a real account casually.
- If registration is unavailable before Auth signup, verify the server-only `SUPABASE_SERVICE_ROLE_KEY` belongs to the same Supabase project as `NEXT_PUBLIC_SUPABASE_URL`.

### Shopify will not connect

- Use `store.myshopify.com`, exact callback `ORIGIN/api/shopify/oauth/callback`, matching environment credentials and a stable HTTPS origin.
- Check requested scopes and reinstall after scope changes.
- OAuth state expires after ten minutes and relies on a same-site cookie; restart from CoY instead of reusing an old callback URL.

### Shopify connects but customers/orders do not import

- There is no bulk import. Create/update a new fake record after installation.
- Verify the four subscriptions and delivery status in Shopify, the integration ID query parameter, HMAC errors in Vercel, and integration ACTIVE status.
- Reinstall while observing logs if fire-and-forget webhook registration failed.

### PrestaShop does not import

- Confirm public HTTPS, Webservice enabled, GET orders/customers permissions and Basic auth access to `/api/?output_format=JSON`.
- Create an order within the 30-minute first-run window; this code filters `date_add`, not a full history.
- Inspect Trigger run logs and `lastSyncAt`. This connector polls; real-time webhook setup is not available from this repo.

### WooCommerce is missing

- This is intentional in the current configuration: it is deferred and hidden. A developer must enable it in `active-integrations.ts`, deploy and then follow section 7.

### AI scoring is not running

- Confirm a recent order (within 90 days), no active cooldown and `lastScoredAt` absent/older than seven days.
- The task processes only five customers per tenant each daily run.
- Check Trigger output `errors`, Mistral key/billing/rate limits, Langfuse trace and `DIRECT_URL`.

### Actions are not generated

- Check churn score versus tenant threshold, recent PENDING/SCHEDULED/SENT actions, opt-out, cooldown, plan/quota, DPA, `SCORING_API_KEY` match and public `NEXT_PUBLIC_APP_URL`.

### Emails are stuck or failed

- `SCHEDULED` waits for the hourly job. `SENDING` over five minutes is marked FAILED by reconciliation.
- Inspect action `failureReason`, Brevo transactional log, verified sender, API key and quota. Fix cause before using Retry.
- Missing `BREVO_API_KEY` makes scheduled actions skip; automated generation can record a failure.

### SMS sends but delivery or STOP is not recorded

- Confirm `NEXT_PUBLIC_APP_URL` is the public HTTPS origin and `BREVO_WEBHOOK_SECRET` is set; CoY adds that callback URL to each SMS as `webUrl`.
- Confirm the Action saved a numeric/string `brevoMessageId` and Brevo shows a callback for that same ID.
- For a reply event, the controlled reply must be exactly `STOP`, `ARRET`, `ARRÊT`, `DESABONNER` or `DÉSABONNER` after trimming/case normalization.
- Check Vercel logs for 401 (wrong query secret) and the customer row for `optedOutAt`/`cooldownUntil`. Do not retry against a real consumer.

### Shopify privacy webhook is not completing

- Verify the app-level compliance URL and `SHOPIFY_CLIENT_SECRET`; invalid HMAC deliberately returns 401.
- Confirm `shop_domain` exactly matches the Shopify integration config. An unknown shop is safely acknowledged without deleting unrelated data.
- Check `audit_logs` for `SHOPIFY_CUSTOMER_DATA_REQUESTED`, `SHOPIFY_CUSTOMER_REDACTED` or `SHOPIFY_SHOP_REDACTED`.
- For data requests, check `INTERNAL_ALERT_EMAIL` or the tenant OWNER inbox and follow the human export procedure. For redaction, verify only synthetic staging records before approving production.

### Stripe payment works but subscription does not update

- Find the exact event in Stripe and inspect endpoint response.
- Confirm the endpoint's own `whsec`, all five event types, tenant metadata and that production/test credentials are not mixed.
- Failed handlers return 500 and remove the dedup claim so Stripe can retry.

### Background jobs are not running

- Confirm a successful Trigger deployment in the correct DEV/STAGING/PROD environment and that schedules are enabled there.
- Confirm project ref/key and task environment variables, especially `DIRECT_URL`.
- A green run can still return `errors > 0`; open its output and console logs.

## 19. Release decision

At the time this guide was updated:

- **Code quality:** `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass. Public pages return 200 locally and protected routes redirect unauthenticated users to `/login`.
- **Local/staging technical evaluation:** usable after the owner supplies sandbox accounts and secrets.
- **Real-customer production:** requires owner configuration and the complete staging scenario. Redaction and SMS STOP logic now exist, but privacy/legal approval, controlled provider tests, import limitations and limited centralized alerting remain launch gates.
- **Dependency security:** no critical audit finding remains after the lockfile refresh, but three high Prisma/config toolchain findings remain and require a compatible upgrade/risk review.
- **Human configuration still required:** all third-party accounts, domains, DNS, billing, legal/privacy approvals, backups, environment secrets and controlled end-to-end verification.

Do not convert this status to “ready” merely because `npm run build` succeeds. Complete the staging scenario, review the remaining limitations, and have the owner, technical lead and privacy lead sign the first-launch checklist.

## Final status

- ✅ **Working:** application shell, public home/help/legal/auth pages, protected dashboard routes, billing/scoring/message/job code paths, Shopify redaction handlers, Brevo delivery/STOP handling, focused safety tests and production build.
- ⚠️ **Requires owner configuration:** every external account/key, Supabase projects and redirects, provider sandboxes, DNS/domain, backups, monitoring ownership, legal approval and the safe staging test in section 17.
- ❌ **Still blocked:** real-customer launch until that owner configuration and staging verification are complete; PrestaShop historical/module support, WooCommerce availability and centralized alerting remain explicit product/operations limitations.
