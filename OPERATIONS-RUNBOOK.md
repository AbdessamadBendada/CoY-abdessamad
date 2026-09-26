# CoY operations runbook

Use staging/test data while diagnosing whenever possible. Never rerun sends to
real customers just to test a fix.

## Messages are not sending

1. Trigger.dev: inspect `send-scheduled` and `send-scheduled-action` runs.
2. Check structured `messaging.backlog` logs for waiting/oldest work and tenant backlog.
3. Check Brevo API key, verified sender, rate-limit responses, and provider logs.
4. Inspect action status: `SCHEDULED` waits; `SENDING` waits for reconciliation; `FAILED` needs its failure reason addressed. `DELIVERY_OUTCOME_UNKNOWN` must be verified in Brevo before a new action is created.

## Scoring stopped

1. Inspect Trigger `score-customers` and `score-customer` runs.
2. Check `scoring.backlog` and `scoring.worker_failed` events in logs/Sentry.
3. Verify Mistral key, quota, and Trigger `DIRECT_URL`.
4. Rate limits retry automatically; do not manually force duplicate customer jobs.

## Shopify stopped importing

1. Check Shopify webhook delivery/HMAC logs and CoY integration status/`lastError`.
2. Confirm the Shopify app secret and webhook URL match this environment.
3. Inspect Sentry/log events with the integration/tenant ID; reconnect only after checking credentials.

## Stripe subscription is wrong

1. Find the Stripe event in Stripe Dashboard and CoY `StripeWebhookEvent`.
2. Check webhook signature failures and event ordering logs.
3. Do not edit tenant plan directly; replay the verified Stripe event or investigate with support.

## Trigger.dev jobs are failing

1. Open the failed run, then find the matching structured event in Sentry/Vercel logs.
2. Verify the Trigger environment has `DIRECT_URL`, encryption, Mistral/Brevo keys and matching throughput settings.
3. Fix configuration first; worker retry/claim state will recover safe work.

## Database migration failed

1. Stop the deployment rollout; do not run reset, `migrate reset`, or manually delete tables.
2. Record the migration name/error and inspect the staging/production migration history.
3. Restore only using the tested provider procedure or create a forward-only corrective migration.

## A secret may be compromised

1. Revoke/rotate it at the provider immediately.
2. Update the matching environment secret in Vercel/Trigger.dev.
3. Redeploy/restart affected workers, review logs for misuse, and rotate related credentials if necessary.

## Production deployment broke

1. Use Vercel's previous known-good deployment rollback.
2. Keep database migrations forward-only; application rollback does not reverse a schema migration.
3. Verify `/api/health`, protected readiness, Trigger runs, Stripe webhooks, and a staging scenario before retrying.
