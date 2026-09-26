import { assertSafeTestEnvironment } from "./helpers/test-environment";

assertSafeTestEnvironment();

// Safe non-secret defaults for modules that validate provider configuration at
// import time. Tests still mock every external request.
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.OAUTH_STATE_SECRET ??= "test-oauth-state-secret";
process.env.SHOPIFY_CLIENT_ID ??= "test-shopify-client";
process.env.GORGIAS_CLIENT_ID ??= "test-gorgias-client";
process.env.GORGIAS_CLIENT_SECRET ??= "test-gorgias-secret";
