import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  // Remplacer par votre Project Ref depuis trigger.dev → Settings → Project ref
  // Format : proj_xxxxxxxxxxxxxxxx
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me",
  runtime: "node",
  maxDuration: 300,
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      prismaExtension({
        schema: "./prisma/schema.prisma",
        mode: "legacy",
      }),
    ],
  },
});
