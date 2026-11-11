// Mirrors the Prisma `Role` enum (server/prisma/schema.prisma). The server asserts at compile
// time that the two match (server/src/enum-sync.ts), so add new roles in both places
export const Role = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
