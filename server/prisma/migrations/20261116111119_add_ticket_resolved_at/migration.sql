-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- Backfill: existing resolved/closed tickets have no real resolution time, so updatedAt is the best available guess
UPDATE "ticket" SET "resolvedAt" = "updatedAt" WHERE "status" IN ('RESOLVED', 'CLOSED');
