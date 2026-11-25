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

describe("POST /api/inbound/email: NUL and invalid Unicode", () => {
  const send = (payload: Record<string, unknown>) =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-inbound-secret": process.env.INBOUND_EMAIL_SECRET! },
      body: JSON.stringify({ from: "jane@example.com", fromName: "Jane", subject: "Hi", text: "Hello", ...payload }),
    });

  it("removes NUL characters from every text field, so PostgreSQL never sees one, and still creates the ticket", async () => {
    const res = await send({
      fromName: "Ja\u0000ne",
      subject: "He\u0000llo",
      text: "Body\u0000 with a NUL",
      bodyHtml: "<p>Hi\u0000</p>",
      messageId: "<abc\u0000@mail>",
    });

    expect(res.status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      fromName: "Jane",
      subject: "Hello",
      body: "Body with a NUL",
      bodyHtml: "<p>Hi</p>",
      messageId: "<abc@mail>",
    });
    for (const value of Object.values(mocks.create.mock.calls[0][0].data)) {
      expect(String(value)).not.toContain("\u0000");
    }
  });

  it("rejects a body that was nothing but NULs as empty, with a 400 and no insert", async () => {
    const res = await send({ text: "\u0000\u0000\u0000" });

    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("replaces a lone surrogate, which PostgreSQL also rejects, with the replacement character", async () => {
    const res = await send({ text: "Hello \ud800 there" });

    expect(res.status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data.body).toBe("Hello � there");
  });

  it("leaves a normal email, with accents and emoji, untouched", async () => {
    const res = await send({ fromName: "José Ñandú", text: "Café ☕ नमस्ते 😀" });

    expect(res.status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ fromName: "José Ñandú", body: "Café ☕ नमस्ते 😀" });
  });
});

// Last on purpose: the counter belongs to the whole file (every request comes from 127.0.0.1), and this one fills it
describe("POST /api/inbound/email: rate limit", () => {
  it("answers 429, before the secret is even checked and without creating a ticket, once an address sends too many", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 130; i++) {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      statuses.push(res.status);
      if (res.status === 429) {
        expect(await res.json()).toEqual({ error: "Too many requests, please try again shortly" });
        expect(res.headers.get("ratelimit")).not.toBeNull();
        break;
      }
    }

    // No secret was sent, so every request before the limit is a 401, and then the limiter steps in
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.slice(0, -1).every((status) => status === 401)).toBe(true);
    expect(statuses.length).toBeLessThanOrEqual(121);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
