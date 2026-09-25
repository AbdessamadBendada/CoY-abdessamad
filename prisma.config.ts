// Next.js uses .env.local for local secrets, but Prisma CLI does not load that
// file automatically. Load it here so the setup commands in the README and
// SETUP-AND-LAUNCH-GUIDE work from a fresh clone. Existing shell/Vercel/Trigger
// environment variables keep precedence because dotenv does not override them.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] as string,
  },
});
