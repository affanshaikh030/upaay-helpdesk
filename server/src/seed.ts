import { auth } from "./auth";
import { prisma } from "./db";

const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME || "Admin";

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  process.exit(1);
}

const ctx = await auth.$context;

if (await ctx.internalAdapter.findUserByEmail(email)) {
  console.log(`User ${email} already exists, skipping`);
} else {
  // Sign-up is disabled, so create the user and credential account directly
  const user = await ctx.internalAdapter.createUser(
    { email, name, emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`Created user ${email}`);
}

await prisma.$disconnect();
