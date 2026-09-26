# CoY testing safety

`npm test` runs Vitest once. `npm run test:watch` keeps it running while developing.

The Phase 1 suite is isolated: Prisma, Stripe, Supabase, Brevo and AI calls are mocked. It does not connect to a database or external provider.

Before every test file, `tests/setup.ts` requires `NODE_ENV=test`. If `DATABASE_URL`, `DIRECT_URL` or `TEST_DATABASE_URL` is present, its host/database/user fingerprint must explicitly contain `test`, `testing`, `development`, `dev`, `localhost` or `127.0.0.1`, and must not contain `production`, `prod` or `live`. The suite stops before imports execute when this guard fails.

For future database integration tests:

1. Create a disposable PostgreSQL/Supabase project containing `test` or `development` in its project/database identity.
2. Copy `.env.test.example` to `.env.test.local` and set only `TEST_DATABASE_URL`.
3. Never point tests at staging or production. Never reuse `DATABASE_URL` from Vercel production.
4. Apply migrations with `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy` only after manually verifying the database identity.
5. Clean test-owned rows or reset only that disposable test database after the suite.

The GitHub Actions workflow uses unmistakably local dummy database URLs for build-time configuration. It starts no database and deploys nothing.

## Current behavior captured for later phases

- Customer detail reads and action cancel/retry mutations include the authenticated tenant ID.
- `OWNER` and `ADMIN` can manage tenant settings, integrations, scenarios and actions; `MEMBER` is blocked from those mutations and from Shopify/Gorgias OAuth or AI scenario previews. Billing and DPA acceptance remain `OWNER`-only.
- Stripe rejects invalid signatures, deduplicates completed events and applies a timestamp guard to billing transitions.
- Scheduled sends claim `SCHEDULED` actions atomically before provider work, exclude processed actions, and cap percentage/fixed promotions.
- Scoring currently selects at most five customers per tenant and uses a seven-day rescore cutoff.
- A GET request to a valid opt-out URL is read-only; the unsubscribe is written atomically only after an explicit form POST.
- Supabase signup happens before the Prisma tenant transaction. If tenant creation fails, a server-only Supabase Admin client removes the newly created Auth user; rollback failure returns `REGISTRATION_RECOVERY_REQUIRED` for operations follow-up.
