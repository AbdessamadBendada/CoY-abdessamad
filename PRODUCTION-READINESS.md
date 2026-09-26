# Production readiness review

Reviewed after Phase 5. This report does not authorize deployment.

## READY

- Application: lint, typecheck, mocked safety tests, and production build pass locally.
- CI: GitHub Actions validates install, lint, typecheck, tests, and build.
- RBAC and tenant isolation: protected by Phase 1–2 tests.
- Scoring and messaging scalability: fair Trigger.dev dispatch, durable claims, retry controls, and backlog logs exist.
- Health: public liveness and protected readiness endpoints exist.
- Security headers: HSTS, frame, referrer, permission, API no-store, and CSP headers are configured.
- Data cleanup: bounded cleanup of processed Stripe webhook deduplication records is scheduled.

## REQUIRES OWNER CONFIGURATION

- Monitoring: create a Sentry project; set `SENTRY_DSN` and `SENTRY_ENVIRONMENT` in staging/production; create alerts for `*.backlog_threshold_exceeded`, worker errors, integration failures, and Stripe webhook errors.
- Health: generate `HEALTHCHECK_SECRET`; configure the hosting monitor to call `/api/health/ready` with `Authorization: Bearer <secret>`.
- Database: create separate staging/production Supabase projects, enable backups, test a restore, then apply migrations with `npx prisma migrate deploy`.
- Trigger.dev: deploy all worker/scheduled tasks and set matching server secrets/configuration.
- Providers: configure separate test/staging/production Stripe, Shopify, Brevo, Mistral, Langfuse, and monitoring credentials. Staging must use controlled recipients only.
- Retention: approve the legal/business retention periods in `DATA-RETENTION.md` before deleting customer, order, audit, security, or AI-trace data.
- Backups: verify Supabase automatic backups and document the provider restore owner.

## BLOCKED

- No live-provider validation occurred in this code review. Shopify, WooCommerce, PrestaShop, Stripe, Brevo, Mistral, and Trigger.dev require sandbox/staging verification by an authorized owner.
- Dependency audit: `npm audit --omit=dev` reports 3 high findings (`prisma` / `@prisma/config` via `deepmerge-ts` stack exhaustion). No critical findings. Do not run `npm audit fix --force`; owner/developer must test an upstream Prisma upgrade in staging when compatible.
