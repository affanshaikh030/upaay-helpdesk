import { Router } from "express";
import { prisma } from "../db";
import { TicketStatus } from "../generated/prisma/enums";

export const statsRouter = Router();

const DAYS = 30;

// Any signed-in user. Counts every ticket, including the ones AI resolved (which the ticket list hides)
statsRouter.get("/", async (_req, res) => {
  // The last 30 UTC days, today included
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (DAYS - 1)));

  const [total, open, resolvedByAi, avg, perDay] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { resolvedByAi: true } }),
    prisma.$queryRaw<{ seconds: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")))::float8 AS seconds
      FROM "ticket" WHERE "resolvedAt" IS NOT NULL`,
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char("createdAt"::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM "ticket" WHERE "createdAt" >= ${since} GROUP BY 1`,
  ]);

  // Days without tickets have no row, so fill them with 0
  const counts = new Map(perDay.map((row) => [row.day, row.count]));
  const ticketsPerDay = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });

  res.json({
    total,
    open,
    resolvedByAi,
    aiResolvedPercent: total === 0 ? 0 : Math.round((resolvedByAi / total) * 1000) / 10,
    avgResolutionSeconds: avg[0]?.seconds ?? null,
    ticketsPerDay,
  });
});
