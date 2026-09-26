import { assertSafeTestEnvironment } from "./helpers/test-environment";

assertSafeTestEnvironment();

// Safe non-secret defaults for modules that validate provider configuration at
// import time. Tests still mock every external request.
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.OAUTH_STATE_SECRET ??= "test-oauth-state-secret";
process.env.SHOPIFY_CLIENT_ID ??= "test-shopify-client";
process.env.GORGIAS_CLIENT_ID ??= "test-gorgias-client";
process.env.GORGIAS_CLIENT_SECRET ??= "test-gorgias-secret";
// Unit tests mock database methods but Prisma 7 constructs an adapter at module
// import time. This inert, explicitly test-only URL is never connected unless a
// database test supplies DATABASE_URL_TEST through its isolated runner.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:55432/coy_test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
