# CoY owner guide

This is the plain-language map of your product. Keep it with the company records and password-manager recovery kit. The technical steps are in `SETUP-AND-LAUNCH-GUIDE.md`.

## What CoY does

CoY receives order/customer information from an online shop and support information from Gorgias. It estimates which customers may leave, creates recovery messages with Mistral AI, sends email/SMS through Brevo, and measures actions and payments. Trigger.dev runs the recurring work in the background.

The current copy is suitable for controlled development and staging tests. Its code checks pass, but it is **not ready for real customers** until the company configures the external services and signs off the staging checklist at the end of the technical guide.

## The accounts the company must own

| Account | What it controls | What you may pay for |
|---|---|---|
| Git provider | The private source code and change history | Private repository/team seats |
| Vercel | The live website, API endpoints, deployments and application logs | Hosting, traffic and function usage |
| Supabase | Login accounts, customer/order/action database and backups | Database size, compute, storage/backups |
| Trigger.dev | Imports, scoring, scheduled messages and maintenance jobs | Job runs and compute |
| Stripe | Your customers' CoY subscriptions, invoices and failed payments | Processing fees and billing products |
| Brevo | Emails, SMS, senders, deliveries and message events | Email/SMS volume; SMS is usually per message |
| Mistral | AI scoring and message creation | Tokens/API usage |
| Langfuse (optional) | AI traces, cost/quality investigation | Stored traces and plan usage |
| Shopify Dev Dashboard | The CoY Shopify app and its merchant permissions | Usually no direct app fee; review/legal work may cost time |
| Gorgias developer account | The CoY Gorgias connection | Gorgias plan/developer access |
| Upstash (optional) | Shared rate-limiting data | Redis usage |
| Domain/DNS registrar | The production and staging internet addresses plus sender-domain DNS | Domain renewal/DNS services |

Use company email addresses and company billing cards. The owner should be the billing/account owner, with at least one trusted recovery administrator. Do not let an agency or one developer be the sole owner.

## Where everything lives

- The application is hosted in **Vercel**.
- The database and user login service live in **Supabase**.
- Payments and subscriptions are managed in **Stripe**.
- Win-back email and SMS are managed in **Brevo**.
- AI usage is managed in **Mistral**; optional traces are in **Langfuse**.
- Scheduled/background work is managed in **Trigger.dev**.
- Ecommerce/support connections are configured in CoY and in the corresponding Shopify, PrestaShop or Gorgias account.
- Errors are split between Vercel Logs, Trigger.dev Runs and provider webhook/message logs. There is no single error dashboard today.

## The three environments

1. **Development** is a developer's computer and test accounts. It can be reset.
2. **Staging** is a private rehearsal copy at a stable staging address. It uses fake customers and test billing.
3. **Production** is the real service. It must have its own database, keys, Shopify app/configuration, Stripe live settings, Brevo sender and job environment.

Never copy production customer data into development or staging. Never paste a production key into a developer's `.env.local` file.

## Credentials and keys

Store these only in the company password manager and the relevant service's secret settings:

- database URLs/passwords and the server-only Supabase service-role key;
- Vercel and Trigger access;
- Stripe/Brevo/Mistral API keys;
- Shopify/Gorgias client secrets;
- CoY encryption, OAuth, scoring, cron and Server Actions secrets;
- DNS/domain registrar recovery access.

The values beginning `NEXT_PUBLIC_` are intentionally visible to the browser. Everything else should be treated as private unless a developer proves otherwise.

The most sensitive CoY-specific value is `ENCRYPTION_KEY`. It unlocks ecommerce/helpdesk credentials stored in the database. Do not casually rotate or delete it: old connected stores would become unreadable. If it is exposed, a developer must plan a credential re-encryption and reconnect affected services.

Never place secrets in email, Slack, tickets, screenshots, source code or `.env.example`. Do not delete an old secret until the replacement is deployed and verified.

## Adding a developer safely

1. Give them their own company identity; never share your login.
2. Start with Git repository and development/staging access only.
3. Give the minimum role in Vercel, Supabase, Trigger.dev and provider sandboxes.
4. Do not grant production database, live Stripe, production Brevo or DNS access unless their task genuinely requires it and is approved.
5. Require MFA on the password manager, Git provider and every provider that supports it.
6. Ask for work through a reviewed branch/pull request. Migrations must be tested on staging first.
7. When they leave, remove their individual access everywhere and review active API keys. Do not solve access by sharing a new team password.

## What must never be deleted casually

- the Git repository or its default/production branch;
- the production Supabase project, database, Auth users or backups;
- the Vercel production project/domain;
- Stripe products, prices, customers, subscriptions or webhook endpoint;
- the Trigger.dev production project/schedules;
- the production Brevo sender/domain/webhook;
- Shopify/Gorgias production app credentials;
- `ENCRYPTION_KEY` or migration files under `prisma/migrations`;
- legal consent, audit, invoice, opt-out and privacy-request records without an approved retention/deletion process.

Archiving or rotating may be correct, but it must have a written plan, backup and second-person check.

## How to know CoY is healthy

Every business day, a named operator should check:

- Trigger.dev: the scheduled runs happened and show no unexplained error/failed counts;
- CoY Actions: no growing list of FAILED or stuck SENDING/SCHEDULED actions;
- CoY Integrations: connected stores show recent sync activity;
- Stripe: webhook deliveries are successful and failed payments are handled;
- Brevo: sends/deliveries look normal and complaints/unsubscribes are handled;
- the internal alerts inbox: every critical alert has an owner;
- Vercel: no repeating application/webhook error.

Every week, check Supabase backups, provider spending/limits, account access and one controlled fake-customer import/score/draft. A “green website” does not prove jobs, payments or messages are healthy.

## If something goes wrong

- Stop or pause the affected sending workflow before experimenting on customer data.
- Record time, tenant/store, action ID and provider event/run ID—never paste full secrets or unnecessary personal data into a ticket.
- Check Trigger.dev for job failures, Vercel for API/webhook errors, then the provider's delivery/event log.
- For suspected credential exposure, revoke the exposed provider key, deploy its replacement and verify service. Treat `ENCRYPTION_KEY` as a planned incident, not a simple rotation.
- For a privacy/deletion request, involve the privacy/legal owner immediately. CoY now deletes matched Shopify customer/shop data and records data requests, but a human must still fulfill access requests and confirm any legal retention duty.

## Current launch blockers the owner must track

1. **Owner configuration and rehearsal:** create the company-owned accounts/secrets, then complete every step in the technical guide's staging scenario. Passing a build is not a launch approval.
2. **Shopify privacy operations:** code performs customer/shop redaction and alerts on access requests. The privacy owner must test it, approve retention rules and own the manual data-export response before App Store submission.
3. **SMS verification:** STOP-reply and unsubscribe handling now exist, but keep production SMS disabled until a controlled phone test proves the Brevo callback works in the target country.
4. **PrestaShop completeness:** the current connector polls the Webservice and imports only a recent window, not full history or real-time webhooks. Decide whether to fund a historical importer/real-time module or clearly limit the product promise.
5. **WooCommerce:** backend pieces exist, but the connector is intentionally hidden and server actions reject deferred connectors. Decide whether it remains out of scope or fund its activation and full test.
6. **Monitoring and test depth:** focused safety tests exist and lint/type/build pass, but there is no central error-alerting product or full browser/end-to-end suite. Assign daily operators and add broader automated coverage before scaling.
7. **Dependency security:** the review removed the critical Next.js findings and patched the Trigger WebSocket dependency, but the latest `npm audit --omit=dev` result must be reviewed at each release. Never apply a forced breaking dependency change blindly.

## What the owner must do next

1. Appoint a technical lead and privacy owner.
2. Create company-owned development, staging and production accounts listed above; place recovery details in the company password manager.
3. Ask the technical lead to follow `SETUP-AND-LAUNCH-GUIDE.md` using sandbox data.
4. Fund and approve the launch-gate workstreams above.
5. Complete the staging end-to-end scenario and have technical/privacy owners sign the first-launch checklist.
6. Only then configure live Stripe/Brevo/Shopify settings and admit controlled production tenants.

## Current status

- ✅ The application builds, focused tests pass, critical Shopify redaction and Brevo SMS tracking/STOP paths are implemented, and the setup/operation process is documented from the actual repository.
- ⚠️ All external accounts, secrets, domains, DNS, backups, legal settings, monitoring ownership and sandbox verification require owner action.
- ❌ Real-customer launch remains blocked until the complete staging scenario and first-launch checklist are signed; connector limitations and centralized monitoring remain explicit gaps.
