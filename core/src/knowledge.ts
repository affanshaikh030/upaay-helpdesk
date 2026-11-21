import { z } from "zod";

// Mirrors the Prisma enums (server/prisma/schema.prisma); server/src/enum-sync.ts fails typecheck if they differ
export const KnowledgeLanguage = {
  EN: "EN",
  HI: "HI",
  GU: "GU",
} as const;

export type KnowledgeLanguage = (typeof KnowledgeLanguage)[keyof typeof KnowledgeLanguage];

// What the auto-resolve pipeline concluded for a ticket
export const AutoResolveDecision = {
  RESOLVE: "RESOLVE",
  ESCALATE: "ESCALATE",
} as const;

export type AutoResolveDecision = (typeof AutoResolveDecision)[keyof typeof AutoResolveDecision];

// Why: RESOLVED is the only success value, everything else is a reason to leave the ticket to a human
export const AutoResolveReason = {
  RESOLVED: "RESOLVED",
  NOT_CLASSIFIED: "NOT_CLASSIFIED",
  URGENT: "URGENT",
  NEGATIVE_SENTIMENT: "NEGATIVE_SENTIMENT",
  REFUND_REQUEST: "REFUND_REQUEST",
  ESCALATION_WORDING: "ESCALATION_WORDING",
  NO_RELEVANT_ARTICLE: "NO_RELEVANT_ARTICLE",
  MODEL_DECLINED: "MODEL_DECLINED",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  INVALID_CITATION: "INVALID_CITATION",
  TICKET_CHANGED: "TICKET_CHANGED",
} as const;

export type AutoResolveReason = (typeof AutoResolveReason)[keyof typeof AutoResolveReason];

export const KNOWLEDGE_TITLE_MAX = 200;
export const KNOWLEDGE_CONTENT_MAX = 20_000;

// POST /api/knowledge, and the admin form. Language is informational only, so it is optional (null when not set)
export const createKnowledgeArticleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(KNOWLEDGE_TITLE_MAX, `Title must be at most ${KNOWLEDGE_TITLE_MAX} characters`),
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(KNOWLEDGE_CONTENT_MAX, `Content must be at most ${KNOWLEDGE_CONTENT_MAX} characters`),
  language: z.enum(KnowledgeLanguage).nullish().transform((language) => language ?? null),
});

// PATCH /api/knowledge/:id. Send only what changes; a null language clears it
export const updateKnowledgeArticleSchema = z
  .object({
    title: createKnowledgeArticleSchema.shape.title,
    content: createKnowledgeArticleSchema.shape.content,
    language: z.enum(KnowledgeLanguage).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");

export type CreateKnowledgeArticleInput = z.input<typeof createKnowledgeArticleSchema>;
export type UpdateKnowledgeArticleInput = z.input<typeof updateKnowledgeArticleSchema>;

// Query params for GET /api/knowledge/attempts (admin only): newest first, paged
export const ATTEMPTS_DEFAULT_PAGE_SIZE = 20;
export const ATTEMPTS_MAX_PAGE_SIZE = 100;

export const attemptListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(ATTEMPTS_MAX_PAGE_SIZE).default(ATTEMPTS_DEFAULT_PAGE_SIZE),
});

export type AttemptListQuery = z.infer<typeof attemptListQuerySchema>;
