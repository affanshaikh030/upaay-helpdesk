import { z } from "zod";

// Provider-neutral payload for POST /api/inbound/email. Provider adapters (SendGrid, Mailgun)
// translate their own format into this
export const inboundEmailSchema = z.object({
  from: z.email("Enter a valid sender email address").toLowerCase(),
  fromName: z.string("Sender name is required").trim().min(1, "Sender name is required").max(200),
  subject: z.string().trim().max(998).default(""),
  text: z.string().max(50_000, "Body must be at most 50,000 characters").refine((v) => v.trim() !== "", "Body is required"),
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
