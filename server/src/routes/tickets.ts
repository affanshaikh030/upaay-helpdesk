import { Router } from "express";
import { UNCATEGORIZED, ticketListQuerySchema, updateTicketSchema } from "@helpdesk/core";
import { prisma } from "../db";
import { Role, type TicketCategory } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";

export const ticketsRouter = Router();

const assigneeSelect = { select: { id: true, name: true } };

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
      select: { id: true, subject: true, fromName: true, fromEmail: true, status: true, category: true, createdAt: true, assignedTo: assigneeSelect },
      orderBy: [primary, { id: sortOrder }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  res.json({ tickets, total });
});

// Any signed-in user: agents a ticket can be assigned to. Registered before /:id
ticketsRouter.get("/assignees", async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: Role.AGENT, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(agents);
});

// Any signed-in user. Unlike the list, includes the body
ticketsRouter.get("/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseId(req.params.id) },
    include: { assignedTo: assigneeSelect },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(ticket);
});

// Any signed-in user. Assigns the ticket to an active agent, or unassigns it with null
ticketsRouter.patch("/:id", async (req, res) => {
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { assignedToId } = parsed.data;
  if (assignedToId !== null) {
    const agent = await prisma.user.findFirst({ where: { id: assignedToId, role: Role.AGENT, deletedAt: null } });
    if (!agent) {
      res.status(400).json({ error: "Assignee must be an active agent" });
      return;
    }
  }
  try {
    const ticket = await prisma.ticket.update({
      where: { id: parseId(req.params.id) },
      data: { assignedToId },
      include: { assignedTo: assigneeSelect },
    });
    res.json(ticket);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }
      // The assignee was removed after the check above
      if (err.code === "P2003") {
        res.status(400).json({ error: "Assignee must be an active agent" });
        return;
      }
    }
    throw err;
  }
});

// Out-of-range ids map to -1 so they simply find nothing
function parseId(raw: string | string[]): number {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 1 && id <= 2_147_483_647 ? id : -1;
}
