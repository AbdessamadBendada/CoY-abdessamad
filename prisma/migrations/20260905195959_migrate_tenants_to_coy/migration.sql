-- Plan A: single-tier CoY at 899€/month.
-- Table is "tenants" (lowercase, @@map), not "Tenant" as an earlier draft
-- of this migration assumed — verified against prisma/schema.prisma before
-- writing this file.
ALTER TABLE "tenants" ALTER COLUMN "plan" SET DEFAULT 'COY';
UPDATE "tenants" SET "plan" = 'COY' WHERE "plan" IN ('ESSENTIEL', 'STARTER', 'CROISSANCE', 'EXPERT');
