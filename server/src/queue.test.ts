import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  on: vi.fn(),
  start: vi.fn(),
  createQueue: vi.fn(),
  work: vi.fn(),
  send: vi.fn(),
  sendThrottled: vi.fn(),
  stop: vi.fn(),
  classifyTicket: vi.fn(),
  autoResolveTicket: vi.fn(),
}));

vi.mock("pg-boss", () => ({
  PgBoss: class {
    on = mocks.on;
    start = mocks.start;
    createQueue = mocks.createQueue;
    work = mocks.work;
    send = mocks.send;
    sendThrottled = mocks.sendThrottled;
    stop = mocks.stop;
  },
}));
vi.mock("./ai", () => ({ isAiConfigured: () => true, describeAiError: (err: Error) => err.message }));
vi.mock("./classify-ticket", () => ({ classifyTicket: mocks.classifyTicket }));
vi.mock("./auto-resolve-ticket", () => ({ autoResolveTicket: mocks.autoResolveTicket }));

import { enqueueClassify, startQueue } from "./queue";

type Handler = (jobs: Array<{ data: Record<string, unknown> }>) => Promise<void>;

// The worker function registered for a queue
async function handlerFor(queue: string): Promise<Handler> {
  await startQueue();
  const call = mocks.work.mock.calls.find(([name]) => name === queue);
  if (!call) throw new Error(`no worker for ${queue}`);
  return call[1];
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("enqueueClassify", () => {
  it("queues just the ticket id by default", async () => {
    await enqueueClassify(7);

    expect(mocks.send).toHaveBeenCalledWith("classify-ticket", { ticketId: 7 });
  });

  it("marks a new ticket for auto-resolve with autoResolve: true", async () => {
    await enqueueClassify(7, { autoResolve: true });

    expect(mocks.send).toHaveBeenCalledWith("classify-ticket", { ticketId: 7, autoResolve: true });
  });
});

describe("the classify worker", () => {
  it("queues auto-resolve after classification succeeded, when the job asks for it", async () => {
    const order: string[] = [];
    mocks.classifyTicket.mockImplementation(async () => void order.push("classified"));
    mocks.send.mockImplementation(async () => void order.push("queued"));
    const handler = await handlerFor("classify-ticket");

    await handler([{ data: { ticketId: 7, autoResolve: true } }]);

    expect(mocks.classifyTicket).toHaveBeenCalledWith(7);
    expect(mocks.send).toHaveBeenCalledWith("auto-resolve-ticket", { ticketId: 7 });
    expect(order).toEqual(["classified", "queued"]);
  });

  it("does not queue auto-resolve for a job without the flag, such as re-analysis", async () => {
    const handler = await handlerFor("classify-ticket");

    await handler([{ data: { ticketId: 7 } }]);
    await handler([{ data: { ticketId: 8, autoResolve: false } }]);

    expect(mocks.classifyTicket).toHaveBeenCalledTimes(2);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("does not queue auto-resolve when classification failed, and fails the job so it retries", async () => {
    mocks.classifyTicket.mockRejectedValue(new Error("503 overloaded"));
    const handler = await handlerFor("classify-ticket");

    await expect(handler([{ data: { ticketId: 7, autoResolve: true } }])).rejects.toThrow("503 overloaded");

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("fails the job when queueing auto-resolve fails, so the retry queues it", async () => {
    mocks.send.mockRejectedValue(new Error("queue down"));
    const handler = await handlerFor("classify-ticket");

    await expect(handler([{ data: { ticketId: 7, autoResolve: true } }])).rejects.toThrow("queue down");
  });
});

describe("the auto-resolve worker", () => {
  it("runs auto-resolve for the ticket, and fails the job when it throws", async () => {
    const handler = await handlerFor("auto-resolve-ticket");

    await handler([{ data: { ticketId: 7 } }]);
    expect(mocks.autoResolveTicket).toHaveBeenCalledWith(7);

    mocks.autoResolveTicket.mockRejectedValue(new Error("timeout"));
    await expect(handler([{ data: { ticketId: 7 } }])).rejects.toThrow("timeout");
  });
});
