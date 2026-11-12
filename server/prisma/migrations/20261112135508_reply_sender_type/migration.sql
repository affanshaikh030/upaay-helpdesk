-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('AGENT', 'CUSTOMER');

-- AlterTable
ALTER TABLE "reply" ADD COLUMN     "senderType" "SenderType" NOT NULL DEFAULT 'AGENT';
