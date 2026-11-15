import { z } from "zod";

// Provider-neutral payload for POST /api/inbound/email. Provider adapters (SendGrid, Mailgun)
// translate their own format into this
export const inboundEmailSchema = z.object({
  from: z.email("Enter a valid sender email address").toLowerCase(),
  fromName: z.string("Sender name is required").trim().min(1, "Sender name is required").max(200),
  subject: z.string().trim().max(998).default(""),
  text: z.string().max(50_000, "Body must be at most 50,000 characters").refine((v) => v.trim() !== "", "Body is required"),
  bodyHtml: z.string().max(100_000, "HTML body must be at most 100,000 characters").optional(),
  messageId: z.string().trim().min(1).max(998).optional(),
});

export type InboundEmail = z.input<typeof inboundEmailSchema>;

// Mirror the Prisma enums (server/prisma/schema.prisma); server/src/enum-sync.ts checks they match
export const TicketStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  GENERAL_QUESTION: "GENERAL_QUESTION",
  TECHNICAL_QUESTION: "TECHNICAL_QUESTION",
  REFUND_REQUEST: "REFUND_REQUEST",
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const SenderType = {
  AGENT: "AGENT",
  CUSTOMER: "CUSTOMER",
} as const;

export type SenderType = (typeof SenderType)[keyof typeof SenderType];

// Query params for GET /api/tickets. Defaults to newest first, unfiltered, 10 per page. `category` also accepts
// "UNCATEGORIZED" for tickets the AI hasn't classified yet; `search` matches subject, name and email
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const UNCATEGORIZED = "UNCATEGORIZED";
export const ticketSortColumns = ["subject", "fromName", "status", "category", "createdAt"] as const;

export type TicketSortColumn = (typeof ticketSortColumns)[number];

export const ticketListQuerySchema = z.object({
  sortBy: z.enum(ticketSortColumns).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(TicketStatus).optional(),
  category: z.enum({ ...TicketCategory, UNCATEGORIZED }).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

// Body for PATCH /api/tickets/:id: any of these, at least one. assignedToId null unassigns; category null clears it
export const updateTicketSchema = z
  .object({
    assignedToId: z.string().min(1).nullable(),
    status: z.enum(TicketStatus),
    category: z.enum(TicketCategory).nullable(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

// Body for POST /api/tickets/:id/replies
export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply is required").max(10_000, "Reply must be at most 10,000 characters"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

// Body for POST /api/tickets/:id/replies/polish: the ticket context plus the agent's draft to rewrite
export const polishReplySchema = z.object({
  subject: z.string().trim().max(998),
  customerName: z.string().trim().max(200),
  customerMessage: z.string().max(50_000),
  draft: createReplySchema.shape.body,
});

export type PolishReplyInput = z.infer<typeof polishReplySchema>;
