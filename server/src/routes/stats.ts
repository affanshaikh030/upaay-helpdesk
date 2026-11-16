import { Router } from "express";
import { prisma } from "../db";
import { TicketStatus } from "../generated/prisma/enums";

export const statsRouter = Router();

// Any signed-in user. Counts every ticket, including the ones AI resolved (which the ticket list hides)
statsRouter.get("/", async (_req, res) => {
  const [total, open, resolvedByAi, avg] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { resolvedByAi: true } }),
    prisma.$queryRaw<{ seconds: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")))::float8 AS seconds
      FROM "ticket" WHERE "resolvedAt" IS NOT NULL`,
  ]);
  res.json({
    total,
    open,
    resolvedByAi,
    aiResolvedPercent: total === 0 ? 0 : Math.round((resolvedByAi / total) * 1000) / 10,
    avgResolutionSeconds: avg[0]?.seconds ?? null,
  });
});
