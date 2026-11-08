import { Router } from "express";
import { z } from "zod";
import { auth } from "../auth";
import { Role } from "../generated/prisma/enums";
import { prisma } from "../db";
import { requireRole } from "../middleware/auth";

export const usersRouter = Router();
export const meRouter = Router();

// Any signed-in user: the current session's user
meRouter.get("/", (_req, res) => {
  res.json(res.locals.user);
});

// Admin only. Explicit select so password hashes and other account data never leave the server
usersRouter.get("/", requireRole(Role.ADMIN), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

// Admin only. Role is never read from the body: new users are always AGENT
usersRouter.post("/", requireRole(Role.ADMIN), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors });
    return;
  }
  const { name, email, password } = parsed.data;

  // Sign-up is disabled, so create the user and credential account directly (as the seed script does)
  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    res.status(409).json({ error: "Email already in use", fieldErrors: { email: ["A user with this email already exists"] } });
    return;
  }

  const created = await ctx.internalAdapter.createUser(
    { email, name, emailVerified: true, role: Role.AGENT },
    { method: "email-password" },
  );
  try {
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: await ctx.password.hash(password),
    });
  } catch (err) {
    // Don't leave a user who can't sign in behind
    await prisma.user.delete({ where: { id: created.id } });
    throw err;
  }
  const user = { id: created.id, name: created.name, email: created.email, role: Role.AGENT, createdAt: created.createdAt };
  res.status(201).json(user);
});
