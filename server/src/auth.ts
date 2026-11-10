import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

const SECRET_PLACEHOLDER = "generate-with-openssl-rand-base64-32";

// Fail fast: a missing or guessable secret would let anyone forge session cookies
function requireSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret === SECRET_PLACEHOLDER || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set to a random value of at least 32 characters (openssl rand -base64 32)",
    );
  }
  return secret;
}

export const auth = betterAuth({
  secret: requireSecret(),
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      // Server-owned: set by the seed script / admin, never by client input
      role: { type: "string", required: false, defaultValue: "AGENT", input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Soft-deleted users must not be able to sign in. Same error as a wrong password so the
        // response doesn't reveal that the account exists
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true },
          });
          if (user?.deletedAt) {
            throw APIError.from("UNAUTHORIZED", {
              code: "INVALID_EMAIL_OR_PASSWORD",
              message: "Invalid email or password",
            });
          }
        },
      },
    },
  },
  // The browser talks to the Vite dev server (different origin than BETTER_AUTH_URL).
  // Comma-separated list, e.g. "http://localhost:5173,https://helpdesk.example.com"
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Production only, so local dev and Playwright runs aren't throttled. Database
  // storage survives restarts and is shared across instances
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    // Explicit so Origin/CSRF validation stays on in every environment; Better Auth
    // otherwise turns it off when NODE_ENV=test
    disableOriginCheck: false,
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
