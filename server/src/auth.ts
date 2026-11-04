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
  // The browser talks to the Vite dev server (different origin than BETTER_AUTH_URL).
  // Comma-separated list, e.g. "http://localhost:5173,https://helpdesk.example.com"
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
});
