import { Router } from "express";
import { prisma } from "../db";
import { requireRole } from "../middleware/auth";

export const usersRouter = Router();

// Admin only. Explicit select so password hashes and other account data never leave the server
usersRouter.get("/", requireRole("ADMIN"), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});
