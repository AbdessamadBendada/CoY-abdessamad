const SAFE_DATABASE_MARKERS = ["localhost", "127.0.0.1", "test", "testing", "development", "dev"];
const UNSAFE_DATABASE_MARKERS = ["production", "prod", "live"];

export function assertSafeTestEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "test") {
    throw new Error(`Tests require NODE_ENV=test; received ${env.NODE_ENV ?? "undefined"}.`);
  }

  const configuredUrls = [env.TEST_DATABASE_URL, env.DATABASE_URL, env.DIRECT_URL].filter(
    (value): value is string => Boolean(value),
  );

  for (const value of configuredUrls) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("Refusing to run tests with an invalid database URL.");
    }

    const fingerprint = `${parsed.hostname}/${parsed.pathname}/${parsed.username}`.toLowerCase();
    const looksUnsafe = UNSAFE_DATABASE_MARKERS.some((marker) => fingerprint.includes(marker));
    const looksExplicitlySafe = SAFE_DATABASE_MARKERS.some((marker) => fingerprint.includes(marker));

    if (looksUnsafe || !looksExplicitlySafe) {
      throw new Error(
        `Refusing to run tests against database host "${parsed.hostname}" because it is not explicitly marked test/development.`,
      );
    }
  }
}
