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
