import type { AddressInfo } from "node:net";
import { aiResolvedModes, ticketListQuerySchema } from "@helpdesk/core";
import express from "express";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  ticketFindMany: vi.fn(),
  ticketCount: vi.fn(),
  ticketFindUnique: vi.fn(),
  replyFindMany: vi.fn(),
  replyCreate: vi.fn(),
}));

vi.mock("../auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("../ai", () => ({ aiModel: "test-model", isAiConfigured: () => true, describeAiError: String }));
vi.mock("../reanalyse", () => ({ queueReanalysis: vi.fn() }));
vi.mock("../db", () => ({
  prisma: {
    ticket: { findMany: mocks.ticketFindMany, count: mocks.ticketCount, findUnique: mocks.ticketFindUnique },
    reply: { findMany: mocks.replyFindMany, create: mocks.replyCreate },
  },
}));

import { Role } from "../generated/prisma/enums";
import { requireAuth } from "../middleware/auth";
import { ticketsRouter } from "./tickets";

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", requireAuth);
  app.use("/api/tickets", ticketsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tickets`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "u1", role: Role.AGENT }, session: { id: "s1" } });
  mocks.ticketFindMany.mockResolvedValue([]);
  mocks.ticketCount.mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const list = (query = "") => fetch(`${base}${query ? `?${query}` : ""}`);
const whereOf = () => mocks.ticketFindMany.mock.calls[0][0].where;

describe("GET /api/tickets: aiResolved", () => {
  it("hides AI-resolved tickets by default, as before, and counts the same way", async () => {
    const res = await list();

    expect(res.status).toBe(200);
    expect(whereOf()).toEqual({ resolvedByAi: false });
    expect(mocks.ticketCount).toHaveBeenCalledWith({ where: { resolvedByAi: false } });
  });

  it("hides them with aiResolved=exclude too", async () => {
    await list("aiResolved=exclude");

    expect(whereOf()).toEqual({ resolvedByAi: false });
  });

  it("lists only the AI-resolved ones with aiResolved=only, and counts only those", async () => {
    await list("aiResolved=only");

    expect(whereOf()).toEqual({ resolvedByAi: true });
    expect(mocks.ticketCount).toHaveBeenCalledWith({ where: { resolvedByAi: true } });
  });

  it("lists every ticket with aiResolved=include", async () => {
    await list("aiResolved=include");

    expect(whereOf()).toEqual({});
    expect(whereOf()).not.toHaveProperty("resolvedByAi");
    expect(mocks.ticketCount).toHaveBeenCalledWith({ where: {} });
  });

  it("combines with the other filters", async () => {
    await list("aiResolved=only&status=RESOLVED&priority=UNSET&search=refund");

    expect(whereOf()).toMatchObject({ resolvedByAi: true, status: "RESOLVED", priority: null });
    expect(whereOf().OR).toHaveLength(3);
  });

  it("rejects an unknown mode with 400, before touching the database", async () => {
    for (const mode of ["all", "true", "false", "ONLY", ""]) {
      const res = await list(`aiResolved=${mode}`);
      expect(res.status, mode).toBe(400);
    }
    expect(mocks.ticketFindMany).not.toHaveBeenCalled();
  });

  it("returns resolvedByAi for each ticket so the list can mark them", async () => {
    await list("aiResolved=include");

    expect(mocks.ticketFindMany.mock.calls[0][0].select.resolvedByAi).toBe(true);
  });

  it("is open to any signed-in user, and still needs a session", async () => {
    expect((await list()).status).toBe(200);

    mocks.getSession.mockResolvedValue(null);
    expect((await list()).status).toBe(401);
  });
});

describe("GET /api/tickets/:id/replies: sourceArticle", () => {
  it("includes the source article's id and title for each reply", async () => {
    mocks.ticketFindUnique.mockResolvedValue({ id: 7 });
    mocks.replyFindMany.mockResolvedValue([
      { id: 1, body: "Hi Jane", senderType: "AGENT", createdAt: "2026-11-21T10:00:00.000Z", author: null, sourceArticle: { id: 4, title: "Certificates" } },
      { id: 2, body: "Thanks", senderType: "AGENT", createdAt: "2026-11-21T11:00:00.000Z", author: { id: "a1", name: "Alice" }, sourceArticle: null },
    ]);

    const res = await fetch(`${base}/7/replies`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].sourceArticle).toEqual({ id: 4, title: "Certificates" });
    expect(body[1].sourceArticle).toBeNull();
    expect(mocks.replyFindMany.mock.calls[0][0].select.sourceArticle).toEqual({ select: { id: true, title: true } });
  });

  it("selects only the article's id and title, never its content", async () => {
    mocks.ticketFindUnique.mockResolvedValue({ id: 7 });
    mocks.replyFindMany.mockResolvedValue([]);

    await fetch(`${base}/7/replies`);

    expect(mocks.replyFindMany.mock.calls[0][0].select.sourceArticle.select).not.toHaveProperty("content");
  });

  it("returns it for a reply an agent just posted too, so the thread stays consistent", async () => {
    mocks.replyCreate.mockResolvedValue({ id: 3, body: "Hello", senderType: "AGENT", createdAt: "x", author: { id: "u1", name: "Me" }, sourceArticle: null });

    const res = await fetch(`${base}/7/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Hello" }),
    });

    expect(res.status).toBe(201);
    expect(mocks.replyCreate.mock.calls[0][0].select.sourceArticle).toEqual({ select: { id: true, title: true } });
    // A human reply never carries a source: the request can't set one
    expect(mocks.replyCreate.mock.calls[0][0].data).not.toHaveProperty("sourceArticleId");
  });
});

describe("aiResolvedModes", () => {
  it("is exclude, only and include, with exclude as the default", () => {
    expect([...aiResolvedModes]).toEqual(["exclude", "only", "include"]);
    expect(ticketListQuerySchema.parse({}).aiResolved).toBe("exclude");
  });
});
