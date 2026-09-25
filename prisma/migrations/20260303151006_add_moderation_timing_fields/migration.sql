-- AlterEnum
ALTER TYPE "ActionStatus" ADD VALUE 'NEEDS_REVIEW';

-- AlterTable
ALTER TABLE "winback_actions" ADD COLUMN     "moderationLog" JSONB,
ADD COLUMN     "persuasionScore" INTEGER,
ADD COLUMN     "psychologicalTrigger" TEXT;
