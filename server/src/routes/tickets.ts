import { Router } from "express";
import { ticketListQuerySchema } from "@helpdesk/core";
import { prisma } from "../db";

export const ticketsRouter = Router();

// Any signed-in user (admins and agents). Sorted by ?sortBy=&sortOrder= (default newest first); id
// breaks ties so the order is stable. The body is left out: it can be large and the list doesn't show it
ticketsRouter.get("/", async (req, res) => {
  const parsed = ticketListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { sortBy, sortOrder } = parsed.data;

  // Uncategorized tickets go last in either direction
  const primary = sortBy === "category" ? { category: { sort: sortOrder, nulls: "last" as const } } : { [sortBy]: sortOrder };
  const tickets = await prisma.ticket.findMany({
    select: { id: true, subject: true, fromName: true, fromEmail: true, status: true, category: true, createdAt: true },
    orderBy: [primary, { id: sortOrder }],
  });
  res.json(tickets);
});
