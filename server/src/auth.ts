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
  // Explicit so limiting doesn't depend on NODE_ENV; database storage survives
  // restarts and is shared across instances
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    // Behind a reverse proxy (e.g. Railway) set TRUST_PROXY_HEADERS=true so the
    // limiter sees real client IPs; leave unset locally so the header can't be spoofed
    ipAddress: {
      ipAddressHeaders:
        process.env.TRUST_PROXY_HEADERS === "true" ? ["x-forwarded-for"] : undefined,
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
});
