import { REANALYSE_LIMIT } from "@helpdesk/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock("./db", () => ({ prisma: { ticket: { findMany: mocks.findMany, count: mocks.count } } }));
vi.mock("./queue", () => ({ enqueueClassifyThrottled: mocks.enqueue }));

import { queueReanalysis } from "./reanalyse";

const tickets = (...ids: number[]) => ids.map((id) => ({ id }));

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("queueReanalysis", () => {
  it("only looks at tickets that still have no sentiment or no priority, oldest first, up to the limit", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);

    await queueReanalysis();

    expect(REANALYSE_LIMIT).toBe(10);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { OR: [{ sentiment: null }, { priority: null }] },
      select: { id: true },
      orderBy: { id: "asc" },
      take: REANALYSE_LIMIT,
    });
    expect(mocks.count).toHaveBeenCalledWith({ where: { OR: [{ sentiment: null }, { priority: null }] } });
  });

  it("restricts the search to the given ticket ids", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);

    await queueReanalysis([4, 8]);

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ sentiment: null }, { priority: null }], id: { in: [4, 8] } } }),
    );
  });

  it("queues each matching ticket and reports what is left", async () => {
    mocks.findMany.mockResolvedValue(tickets(1, 2, 3));
    mocks.count.mockResolvedValue(12);
    mocks.enqueue.mockResolvedValue("job-id");

    await expect(queueReanalysis()).resolves.toEqual({ queued: 3, remaining: 9 });
    expect(mocks.enqueue.mock.calls.map(([id]) => id)).toEqual([1, 2, 3]);
  });

  it("does not count a ticket that was throttled because it was queued moments ago", async () => {
    mocks.findMany.mockResolvedValue(tickets(1, 2, 3));
    mocks.count.mockResolvedValue(3);
    mocks.enqueue.mockResolvedValueOnce("job-1").mockResolvedValueOnce("job-2").mockResolvedValueOnce(null);

    await expect(queueReanalysis()).resolves.toEqual({ queued: 2, remaining: 1 });
  });

  it("keeps going when one enqueue fails, and logs only the message", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findMany.mockResolvedValue(tickets(1, 2));
    mocks.count.mockResolvedValue(2);
    mocks.enqueue.mockRejectedValueOnce(new Error("queue down")).mockResolvedValueOnce("job-2");

    await expect(queueReanalysis()).resolves.toEqual({ queued: 1, remaining: 1 });
    expect(error).toHaveBeenCalledWith("Re-analysis enqueue for ticket 1 failed:", "queue down");
  });

  it("queues nothing when every ticket already has both", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);

    await expect(queueReanalysis()).resolves.toEqual({ queued: 0, remaining: 0 });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
