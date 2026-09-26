import "dotenv/config";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl || !/(test|testing|coy_test)/i.test(databaseUrl) || /(prod|production|staging)/i.test(databaseUrl)) {
  throw new Error("Refusing integration tests: DATABASE_URL_TEST must explicitly identify a test-only database and must not contain staging/production.");
}
const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", DATABASE_URL: databaseUrl, DIRECT_URL: process.env.DIRECT_URL_TEST ?? databaseUrl };
for (const [command, args] of [["npx", ["prisma", "migrate", "deploy"]], ["npx", ["vitest", "run", "--config", "vitest.integration.config.ts"]]] as const) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
