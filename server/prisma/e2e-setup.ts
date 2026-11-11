import { auth } from "../src/auth";
import { prisma } from "../src/db";

// Prepares the Playwright test database (migrate + empty tables) and seeds the admin and agent test users.
// Run via `bun run test:db` (the Playwright config does this before starting the API).

const url = new URL(process.env.DATABASE_URL ?? "");
const dbName = url.pathname.slice(1);

// Connection-string parameters that can redirect the connection to another server, bypassing the
// host check below (e.g. ?host=...). Harmless ones such as ?schema=public are allowed
const REDIRECTING_PARAMS = ["host", "hostaddr", "port", "service", "options"];
const redirecting = [...url.searchParams.keys()].filter((key) => REDIRECTING_PARAMS.includes(key.toLowerCase()));

// Guard: this script empties the database, so only ever run it against a *_test one
if (!dbName.endsWith("_test") || !["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error(`Refusing to reset "${dbName}" on ${url.hostname}: must be a local database named *_test`);
  process.exit(1);
}
if (redirecting.length > 0) {
  console.error(
    `Refusing to reset "${dbName}": DATABASE_URL must not set ${redirecting.join(", ")} (they can override the host checked above)`,
  );
  process.exit(1);
}

// Apply migrations (non-destructive; creates the database if it doesn't exist yet)
const migrate = Bun.spawnSync(["bunx", "--bun", "prisma", "migrate", "deploy"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (migrate.exitCode !== 0) process.exit(migrate.exitCode ?? 1);

// Start every run from empty tables (keeps the schema and migration history)
const tables = await prisma.$queryRaw<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
if (tables.length > 0) {
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

const ctx = await auth.$context;

async function createUser(prefix: "ADMIN" | "AGENT", name: string) {
  const email = process.env[`E2E_${prefix}_EMAIL`]?.toLowerCase();
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`E2E_${prefix}_EMAIL and E2E_${prefix}_PASSWORD must be set`);

  // Sign-up is disabled, so create the user and credential account directly
  const user = await ctx.internalAdapter.createUser(
    { email, name, emailVerified: true, role: prefix },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`Created test ${prefix.toLowerCase()} ${email}`);
}

await createUser("ADMIN", "Test Admin");
await createUser("AGENT", "Test Agent");

await prisma.$disconnect();
