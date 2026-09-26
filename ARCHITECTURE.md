# CoY architecture

## Layers

```text
src/app       Next.js pages, layouts, server actions and route handlers
src/features  Business domains and provider-specific implementation
src/shared    Cross-domain infrastructure and small generic primitives
src/trigger   Trigger.dev schedule and worker registration
```

`app` and `trigger` are entrypoints. They may call feature APIs, but should not
contain reusable business workflows. Features may use `shared`; `shared` must
never import a feature. Avoid feature-to-feature imports unless one feature is
explicitly orchestrating another at an entrypoint.

## Domains

| Domain | Owns |
|---|---|
| `features/auth` | Supabase-backed authentication and onboarding state |
| `features/scoring` | AI scoring, customer scoring inputs, eligibility, fair dispatch and workers |
| `features/winback` | Win-back action selection, scenario defaults and cooldown cleanup |
| `features/messaging` | Brevo email/SMS delivery, lifecycle email, send dispatch and reconciliation |
| `features/billing` | Stripe client and subscription, invoice, quota and ROI services |
| `features/integrations` | Shopify/Gorgias connection helpers plus WooCommerce, PrestaShop and Crisp processing |
| `features/analytics` | Attribution and beta metric helpers |
| `shared` | Prisma client, Supabase transport, encryption/RBAC/audit primitives, environment throughput configuration, and generic utilities |

## Dependency rules

```text
app / trigger → features → shared
```

Route handlers should authenticate/validate the request, call the owning
feature, then return a framework response. Keep provider code inside its
integration or messaging feature. Do not put Shopify, Stripe, Mistral, Brevo,
or customer business rules into `shared`.

## Adding a feature

1. Identify the business owner before creating a file.
2. Create `src/features/<domain>/` and put domain logic there.
3. Keep its exported API small; do not reach into another feature's internals.
4. Make the page, route handler, or Trigger task call that API.
5. Add/extend tests in `tests/unit` unless a co-located test better explains the feature.
6. Run typecheck and tests before moving to another domain.

## Adding an integration

Place provider-specific logic in `features/integrations/<provider>/`. Keep
OAuth/webhook routes in `src/app/api`, but make them thin adapters around the
provider feature. Share only actual common connection primitives under
`features/integrations/connection`; do not force Shopify, WooCommerce and
PrestaShop behind a fake uniform abstraction.

## AI-assisted development rule

When using Codex, Claude Code, Cursor, or another AI coding tool, do **not**
let it create business logic in arbitrary `src/lib` files. First identify the
owning feature. New business behavior normally belongs in that feature;
framework route files stay thin; `shared` is only for genuinely cross-domain
infrastructure or generic helpers.
