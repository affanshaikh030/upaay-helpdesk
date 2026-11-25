import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createLimiter } from "./rate-limit";

const servers: ReturnType<ReturnType<typeof express>["listen"]>[] = [];

// A tiny app with one limited route, keyed the way the real limiters are: by the address Express reports
async function start(options: { trustProxy?: number; limit: number }) {
  const app = express();
  if (options.trustProxy) app.set("trust proxy", options.trustProxy);
  app.get("/", createLimiter({ limit: options.limit, windowMs: 60_000, key: (req) => req.ip ?? "unknown" }), (_req, res) => {
    res.json({ ok: true });
  });
  const server = await new Promise<(typeof servers)[number]>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

const get = (url: string, forwardedFor?: string) =>
  fetch(url, { headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {} });

describe("createLimiter", () => {
  it("lets the limit through, then answers 429 with the JSON message and the standard rate limit headers", async () => {
    const url = await start({ limit: 2 });

    const first = await get(url);
    expect(first.status).toBe(200);
    expect(first.headers.get("ratelimit")).toContain("remaining=1");
    expect(first.headers.get("ratelimit-policy")).toContain("2");
    expect(first.headers.get("x-ratelimit-limit")).toBeNull(); // no legacy headers
    expect((await get(url)).status).toBe(200);

    const blocked = await get(url);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "Too many requests, please try again shortly" });
    expect(blocked.headers.get("retry-after")).not.toBeNull();
  });

  describe("behind a proxy", () => {
    it("without trust proxy, every client looks like the proxy and shares one counter (why index.ts must set it)", async () => {
      const url = await start({ limit: 1 });

      expect((await get(url, "203.0.113.1")).status).toBe(200);
      expect((await get(url, "203.0.113.2")).status).toBe(429);
    });

    it("with one trusted hop, counts each real client address on its own", async () => {
      const url = await start({ limit: 1, trustProxy: 1 });

      expect((await get(url, "203.0.113.1")).status).toBe(200);
      expect((await get(url, "203.0.113.2")).status).toBe(200);
      expect((await get(url, "203.0.113.1")).status).toBe(429);
    });

    it("with one trusted hop, ignores a made-up address the client put in front of the one the proxy added", async () => {
      const url = await start({ limit: 1, trustProxy: 1 });

      // The proxy appends the address it saw (203.0.113.9): whatever comes before it is the client's own claim
      expect((await get(url, "10.0.0.1, 203.0.113.9")).status).toBe(200);
      expect((await get(url, "10.0.0.2, 203.0.113.9")).status).toBe(429);
      expect((await get(url, "10.0.0.3, 203.0.113.9")).status).toBe(429);
    });
  });

  it("keeps separate counters per key, which is how each user gets their own", async () => {
    const app = express();
    app.get("/:user", createLimiter({ limit: 1, windowMs: 60_000, key: (req) => String(req.params.user) }), (_req, res) => {
      res.json({ ok: true });
    });
    const server = await new Promise<(typeof servers)[number]>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    servers.push(server);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    expect((await get(`${base}/ann`)).status).toBe(200);
    expect((await get(`${base}/ben`)).status).toBe(200);
    expect((await get(`${base}/ann`)).status).toBe(429);
  });
});
