import { PgBoss } from "pg-boss";
import { describeAiError, isAiConfigured } from "./ai";
import { autoResolveTicket } from "./auto-resolve-ticket";
import { classifyTicket } from "./classify-ticket";

const CLASSIFY_QUEUE = "classify-ticket";
const AUTO_RESOLVE_QUEUE = "auto-resolve-ticket";

// autoResolve is set only for a ticket that has just arrived by email: the worker then queues auto-resolve once the
// ticket is classified (see startQueue). Re-analysis leaves it out
type ClassifyJob = { ticketId: number; autoResolve?: boolean };

export const boss = new PgBoss(process.env.DATABASE_URL!);

// Message only: the error can carry connection details
boss.on("error", (err) => console.error("Queue error:", err.message));

export async function startQueue() {
  await boss.start();
  // Retries are queue-level so every job inherits them; exponential backoff: ~30s, 1m, 2m, 4m (capped at 10m)
  const retryOptions = {
    retryLimit: 4,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 600,
    expireInSeconds: 120,
  };
  await boss.createQueue(CLASSIFY_QUEUE, retryOptions);
  await boss.createQueue(AUTO_RESOLVE_QUEUE, retryOptions);

  // No key (e.g. the e2e API) means no worker: jobs stay queued and Gemini is never called
  if (!isAiConfigured()) {
    console.warn("Classification worker not started: AI is not configured");
    return;
  }
  await boss.work<ClassifyJob>(CLASSIFY_QUEUE, async ([job]) => {
    try {
      await classifyTicket(job.data.ticketId);
    } catch (err) {
      console.error(`Classify ticket ${job.data.ticketId} failed:`, describeAiError(err));
      throw err; // fails the job so pg-boss retries it
    }
    // Auto-resolve needs the priority and sentiment this job just set, so it is queued only after classification
    // succeeded, and only for a new ticket (re-analysis leaves the flag off). A failure here fails the job: the retry
    // finds the ticket already classified and goes straight back to this step
    if (job.data.autoResolve) {
      try {
        await enqueueAutoResolve(job.data.ticketId);
      } catch (err) {
        console.error(`Queue auto-resolve for ticket ${job.data.ticketId} failed:`, err instanceof Error ? err.message : err);
        throw err;
      }
    }
  });
  await boss.work<{ ticketId: number }>(AUTO_RESOLVE_QUEUE, async ([job]) => {
    try {
      await autoResolveTicket(job.data.ticketId);
    } catch (err) {
      console.error(`Auto-resolve ticket ${job.data.ticketId} failed:`, describeAiError(err));
      throw err;
    }
  });
}

export function enqueueAutoResolve(ticketId: number) {
  return boss.send(AUTO_RESOLVE_QUEUE, { ticketId });
}

// With autoResolve, the classify worker queues auto-resolve after it succeeds, so the two never run out of order
export function enqueueClassify(ticketId: number, options: { autoResolve?: boolean } = {}) {
  const job: ClassifyJob = options.autoResolve ? { ticketId, autoResolve: true } : { ticketId };
  return boss.send(CLASSIFY_QUEUE, job);
}

// For re-analysis: at most one job per ticket every 5 minutes, so repeated requests can't pile up model calls.
// Resolves null when the ticket was already queued within that window
export function enqueueClassifyThrottled(ticketId: number) {
  return boss.sendThrottled(CLASSIFY_QUEUE, { ticketId }, null, 300, String(ticketId));
}

// Waits for the active job (up to the timeout), then closes the pool
export function stopQueue() {
  return boss.stop({ graceful: true, timeout: 20_000 });
}
