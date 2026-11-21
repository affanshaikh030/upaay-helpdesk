-- CreateEnum
CREATE TYPE "KnowledgeLanguage" AS ENUM ('EN', 'HI', 'GU');

-- CreateEnum
CREATE TYPE "AutoResolveDecision" AS ENUM ('RESOLVE', 'ESCALATE');

-- CreateEnum
CREATE TYPE "AutoResolveReason" AS ENUM ('RESOLVED', 'NOT_CLASSIFIED', 'URGENT', 'NEGATIVE_SENTIMENT', 'REFUND_REQUEST', 'ESCALATION_WORDING', 'NO_RELEVANT_ARTICLE', 'MODEL_DECLINED', 'LOW_CONFIDENCE', 'INVALID_CITATION', 'TICKET_CHANGED');

-- AlterTable
ALTER TABLE "reply" ADD COLUMN     "sourceArticleId" INTEGER;

-- CreateTable
CREATE TABLE "knowledge_article" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" "KnowledgeLanguage",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    -- Hand-edited: Prisma can't express a generated column. Postgres keeps it in sync with title and content;
    -- the two-argument to_tsvector with a literal config is immutable, which generated columns require
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', "title"), 'A') || setweight(to_tsvector('english', "content"), 'B')
    ) STORED,

    CONSTRAINT "knowledge_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_resolve_attempt" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "suppliedArticleIds" INTEGER[],
    "citedArticleIds" INTEGER[],
    "topRank" DOUBLE PRECISION,
    "modelResolvable" BOOLEAN,
    "confidence" DOUBLE PRECISION,
    "decision" "AutoResolveDecision" NOT NULL,
    "reason" "AutoResolveReason" NOT NULL,
    "draftReply" TEXT,
    "acted" BOOLEAN NOT NULL DEFAULT false,
    "shadow" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_resolve_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_article_searchVector_idx" ON "knowledge_article" USING GIN ("searchVector");

-- CreateIndex
CREATE UNIQUE INDEX "auto_resolve_attempt_ticketId_key" ON "auto_resolve_attempt"("ticketId");

-- CreateIndex
CREATE INDEX "auto_resolve_attempt_createdAt_idx" ON "auto_resolve_attempt"("createdAt");

-- CreateIndex
CREATE INDEX "reply_sourceArticleId_idx" ON "reply"("sourceArticleId");

-- AddForeignKey
ALTER TABLE "reply" ADD CONSTRAINT "reply_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "knowledge_article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_resolve_attempt" ADD CONSTRAINT "auto_resolve_attempt_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
