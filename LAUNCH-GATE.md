# Controlled launch gate

Do not use live merchants or consumers until every item below has an observed result.

- [ ] Run `npm run lint && npm run typecheck && npm run test && npm run build`; all commands exit 0.
- [ ] Apply the new migration to the **staging** database: `npx prisma migrate deploy`; inspect `integrations.backfillStatus` columns exist.
- [ ] Set staging credentials, then run `npm run verify:staging`; expected output: `STAGING VERIFICATION: PASS`.
- [ ] Connect a Shopify development store; Integrations shows active and the database row progresses `RUNNING` → `COMPLETED`, with non-zero historical counters where store history exists.
- [ ] Confirm an imported customer has orders, `totalOrders`, `totalSpent`, and `lastOrderAt`; Trigger.dev `score-customers` then scores it.
- [ ] Generate a win-back action and send only to a controlled Brevo test inbox; inspect Brevo transactional logs and CoY action status.
- [ ] Open an unsubscribe link: GET must show confirmation only; submit confirmation and verify `optedOutAt` is set.
- [ ] Use Stripe test mode to start/cancel a subscription; inspect Stripe webhook delivery and tenant billing state.
- [ ] Send a deliberately safe staging exception; verify it appears in Sentry without tokens, credentials, customer content, email, or phone data.
- [ ] Verify Upstash blocks repeated staging login attempts and recovers after its configured window.
- [ ] Verify a Supabase backup exists and complete one restore rehearsal away from production.

External provider credentials are intentionally not included in this repository. A successful local build is not evidence that these checks passed.
