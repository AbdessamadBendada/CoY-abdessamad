-- Plan A: single-tier CoY at 899€/month.
-- ALTER TYPE ... ADD VALUE cannot run inside the transaction that uses the
-- new value, hence this migration is isolated: it adds COY to the enum and
-- does nothing else. The default/UPDATE follow in a separate migration.
ALTER TYPE "Plan" ADD VALUE 'COY';
