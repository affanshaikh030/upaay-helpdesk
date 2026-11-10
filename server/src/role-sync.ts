import type { Role as CoreRole } from "@helpdesk/core";
import type { Role as PrismaRole } from "./generated/prisma/enums";

// Compile-time check that the client-facing Role in @helpdesk/core matches the Prisma enum.
// Fails typecheck if a role is added or removed in only one place
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const roleEnumsMatch: Equal<CoreRole, PrismaRole> = true;
