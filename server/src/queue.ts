import { PgBoss } from "pg-boss";
import { describeAiError, isAiConfigured } from "./ai";
import { classifyTicket } from "./classify-ticket";

const CLASSIFY_QUEUE = "classify-ticket";

export const boss = new PgBoss(process.env.DATABASE_URL!);

// Message only: the error can carry connection details
boss.on("error", (err) => console.error("Queue error:", err.message));

export async function startQueue() {
  await boss.start();
  // Retries are queue-level so every job inherits them; exponential backoff: ~30s, 1m, 2m, 4m (capped at 10m)
  await boss.createQueue(CLASSIFY_QUEUE, {
    retryLimit: 4,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 600,
    expireInSeconds: 120,
  });

  // No key (e.g. the e2e API) means no worker: jobs stay queued and Gemini is never called
  if (!isAiConfigured()) {
    console.warn("Classification worker not started: AI is not configured");
    return;
  }
  await boss.work<{ ticketId: number }>(CLASSIFY_QUEUE, async ([job]) => {
    try {
      await classifyTicket(job.data.ticketId);
    } catch (err) {
      console.error(`Classify ticket ${job.data.ticketId} failed:`, describeAiError(err));
      throw err; // fails the job so pg-boss retries it
    }
  });
}

export function enqueueClassify(ticketId: number) {
  return boss.send(CLASSIFY_QUEUE, { ticketId });
}

// Waits for the active job (up to the timeout), then closes the pool
export function stopQueue() {
  return boss.stop({ graceful: true, timeout: 20_000 });
}
