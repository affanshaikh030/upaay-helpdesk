import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      // Server-owned: set by the seed script / admin, never by client input
      role: { type: "string", required: false, defaultValue: "AGENT", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
});
