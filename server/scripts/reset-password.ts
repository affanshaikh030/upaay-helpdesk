// Usage (from server/): NEW_PASSWORD='...' bun run reset-password <email>
// The password comes from the environment so it doesn't end up in shell history or the process list.
// Only the credential account's password hash changes: sessions and all other data are left alone.
import { auth } from "../src/auth";
import { prisma } from "../src/db";

const MIN_PASSWORD_LENGTH = 12;
const PLACEHOLDER_PASSWORDS = ["change-me", "password", "password123"];

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.NEW_PASSWORD;

if (!email || !password) {
  console.error("Usage: NEW_PASSWORD='<new password>' bun run reset-password <email>");
  process.exit(1);
}

if (password.length < MIN_PASSWORD_LENGTH || PLACEHOLDER_PASSWORDS.includes(password.toLowerCase())) {
  // Hashing directly skips Better Auth's own password checks, so enforce the seed script's rules here
  console.error(`NEW_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters and not a placeholder`);
  process.exit(1);
}

const ctx = await auth.$context;

const found = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
if (!found) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

if (!found.accounts.some((account) => account.providerId === "credential")) {
  console.error(`User ${email} has no email/password account, nothing was changed`);
  process.exit(1);
}

await ctx.internalAdapter.updatePassword(found.user.id, await ctx.password.hash(password));
console.log(`Password updated for ${email}`);

const { deletedAt } = await prisma.user.findUniqueOrThrow({
  where: { id: found.user.id },
  select: { deletedAt: true },
});
if (deletedAt) {
  console.warn("Warning: this user is soft-deleted and still can't sign in");
}

await prisma.$disconnect();
