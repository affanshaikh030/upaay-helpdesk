import { Router } from "express";
import { prisma } from "../db";

export const ticketsRouter = Router();

// Any signed-in user (admins and agents). Newest first; id breaks ties for tickets created in the
// same millisecond. The body is left out: it can be large and the list doesn't show it
ticketsRouter.get("/", async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    select: { id: true, subject: true, fromName: true, fromEmail: true, status: true, category: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(tickets);
});
