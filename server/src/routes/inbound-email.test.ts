import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // Read when the router is imported
  process.env.INBOUND_EMAIL_SECRET = "test-secret-".padEnd(40, "x");
  return { create: vi.fn(), enqueueClassify: vi.fn() };
});

vi.mock("../db", () => ({ prisma: { ticket: { create: mocks.create, findUniqueOrThrow: vi.fn() } } }));
vi.mock("../queue", () => ({ enqueueClassify: mocks.enqueueClassify }));

import { inboundEmailRouter } from "./inbound-email";

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let url: string;

beforeAll(async () => {
  const app = express();
  app.use("/api/inbound/email", inboundEmailRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/inbound/email`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ id: 12 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const post = () =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-inbound-secret": process.env.INBOUND_EMAIL_SECRET! },
    body: JSON.stringify({ from: "jane@example.com", fromName: "Jane", subject: "Hi", text: "Hello" }),
  });

describe("POST /api/inbound/email", () => {
  it("queues only classification for the new ticket, flagged so auto-resolve follows it", async () => {
    const res = await post();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 12 });
    expect(mocks.enqueueClassify).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueClassify).toHaveBeenCalledWith(12, { autoResolve: true });
  });

  it("still answers 201 when the queue is down, and logs only the message", async () => {
    mocks.enqueueClassify.mockRejectedValue(new Error("queue down"));

    const res = await post();

    expect(res.status).toBe(201);
    expect(console.error).toHaveBeenCalledWith("Enqueue classify for ticket 12 failed:", "queue down");
  });
});
