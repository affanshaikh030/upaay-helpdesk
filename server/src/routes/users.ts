import { Router } from "express";
import { createUserSchema, updateUserSchema } from "@helpdesk/core";
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
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
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

// Admin only. Role is never editable here. A blank password leaves the current one unchanged
usersRouter.patch("/:id", requireRole(Role.ADMIN), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors });
    return;
  }
  const { name, email, password } = parsed.data;
  const id = String(req.params.id);

  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const ctx = await auth.$context;
  const other = email !== existing.email ? await ctx.internalAdapter.findUserByEmail(email) : null;
  if (other) {
    res.status(409).json({ error: "Email already in use", fieldErrors: { email: ["A user with this email already exists"] } });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (password) {
    await ctx.internalAdapter.updatePassword(id, await ctx.password.hash(password));
    // A changed password should end the user's existing sessions, unless an admin is editing themselves
    if (id !== res.locals.user.id) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }
  }
  res.json(user);
});

// Admin only. Soft delete: the row is kept (deletedAt set), the user is hidden, signed out and can't sign in
usersRouter.delete("/:id", requireRole(Role.ADMIN), async (req, res) => {
  const id = String(req.params.id);

  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (existing.role === Role.ADMIN) {
    res.status(403).json({ error: "Admins cannot be deleted" });
    return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);
  res.status(204).end();
});
