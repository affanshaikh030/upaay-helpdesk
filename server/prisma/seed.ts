import { auth } from "../src/auth";
import { prisma } from "../src/db";

const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME || "Admin";

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  process.exit(1);
}

const MIN_PASSWORD_LENGTH = 12;
const PLACEHOLDER_PASSWORDS = ["change-me", "password", "password123"];

const ctx = await auth.$context;

const existing = await ctx.internalAdapter.findUserByEmail(email);

if (existing) {
  const current = await prisma.user.findUniqueOrThrow({ where: { email } });
  if (current.role === "ADMIN") {
    console.log(`User ${email} is already an ADMIN, nothing to do`);
  } else if (process.env.SEED_PROMOTE_EXISTING === "true") {
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    console.log(`Promoted existing user ${email} to ADMIN`);
  } else {
    console.error(
      `User ${email} exists with role ${current.role}. Check SEED_ADMIN_EMAIL, or set SEED_PROMOTE_EXISTING=true to promote them to ADMIN`,
    );
    process.exit(1);
  }
} else {
  if (password.length < MIN_PASSWORD_LENGTH || PLACEHOLDER_PASSWORDS.includes(password.toLowerCase())) {
    // This path hashes directly, so Better Auth's own password checks don't run
    console.error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters and not a placeholder`,
    );
    process.exit(1);
  }
  // Sign-up is disabled, so create the user and credential account directly
  const user = await ctx.internalAdapter.createUser(
    { email, name, emailVerified: true, role: "ADMIN" },
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
