import { Router } from "express";
import { UNCATEGORIZED, ticketListQuerySchema } from "@helpdesk/core";
import { prisma } from "../db";
import type { TicketCategory } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";

export const ticketsRouter = Router();

// Any signed-in user (admins and agents). Filtered by ?status=&category=&search= sorted by ?sortBy=&sortOrder= (default newest first) and paged by ?page=&pageSize=; `total` counts all matches; id
// breaks ties so the order is stable. The body is left out: it can be large and the list doesn't show it
ticketsRouter.get("/", async (req, res) => {
  const parsed = ticketListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { sortBy, sortOrder, status, category, search, page, pageSize } = parsed.data;

  const where: Prisma.TicketWhereInput = {
    ...(status && { status }),
    ...(category && { category: category === UNCATEGORIZED ? null : (category as TicketCategory) }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { fromName: { contains: search, mode: "insensitive" } },
        { fromEmail: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  // Uncategorized tickets go last in either direction
  const primary = sortBy === "category" ? { category: { sort: sortOrder, nulls: "last" as const } } : { [sortBy]: sortOrder };
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: { id: true, subject: true, fromName: true, fromEmail: true, status: true, category: true, createdAt: true },
      orderBy: [primary, { id: sortOrder }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  res.json({ tickets, total });
});
