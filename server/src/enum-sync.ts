import type { Role as CoreRole, SenderType as CoreSenderType, TicketCategory as CoreTicketCategory, TicketStatus as CoreTicketStatus } from "@helpdesk/core";
import type {
  Role as PrismaRole,
  SenderType as PrismaSenderType,
  TicketCategory as PrismaTicketCategory,
  TicketStatus as PrismaTicketStatus,
} from "./generated/prisma/enums";

// Compile-time checks that the client-facing enums in @helpdesk/core match the Prisma enums.
// Fails typecheck if a value is added or removed in only one place
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const roleEnumsMatch: Equal<CoreRole, PrismaRole> = true;
export const ticketStatusEnumsMatch: Equal<CoreTicketStatus, PrismaTicketStatus> = true;
export const ticketCategoryEnumsMatch: Equal<CoreTicketCategory, PrismaTicketCategory> = true;
export const senderTypeEnumsMatch: Equal<CoreSenderType, PrismaSenderType> = true;
