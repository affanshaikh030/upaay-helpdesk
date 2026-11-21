import { REANALYSE_LIMIT } from "@helpdesk/core";
import { prisma } from "./db";
import { enqueueClassifyThrottled } from "./queue";

// Queues the AI analysis again for tickets that still have no sentiment or priority (older tickets, or a job that
// never succeeded). Never touches a ticket that already has both, and queues at most REANALYSE_LIMIT per call.
// With ticketIds it only considers those tickets, otherwise the oldest untagged ones. `remaining` counts untagged
// tickets that are not queued yet
export async function queueReanalysis(ticketIds?: number[]) {
  const where = {
    OR: [{ sentiment: null }, { priority: null }],
    ...(ticketIds && { id: { in: ticketIds } }),
  };
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({ where, select: { id: true }, orderBy: { id: "asc" }, take: REANALYSE_LIMIT }),
    prisma.ticket.count({ where }),
  ]);

  let queued = 0;
  for (const { id } of tickets) {
    try {
      if (await enqueueClassifyThrottled(id)) queued++;
    } catch (err) {
      // The job is not stored, so it stays in `remaining`. Message only: the error can carry connection details
      console.error(`Re-analysis enqueue for ticket ${id} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return { queued, remaining: total - queued };
}
