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
  replyCount: vi.fn(),
  attemptFindUnique: vi.fn(),
  articleFindUnique: vi.fn(),
}));

vi.mock("../auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("../ai", () => ({ aiModel: "test-model", isAiConfigured: () => true, describeAiError: String }));
vi.mock("../reanalyse", () => ({ queueReanalysis: vi.fn() }));
vi.mock("../db", () => ({
  prisma: {
    ticket: { findMany: mocks.ticketFindMany, count: mocks.ticketCount, findUnique: mocks.ticketFindUnique },
    reply: { findMany: mocks.replyFindMany, create: mocks.replyCreate, count: mocks.replyCount },
    autoResolveAttempt: { findUnique: mocks.attemptFindUnique },
    knowledgeArticle: { findUnique: mocks.articleFindUnique },
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

describe("GET /api/tickets/:id/suggested-reply", () => {
  const draft = { decision: "RESOLVE", draftReply: "Hi Jane, a certificate is issued on completion.", confidence: 0.9, citedArticleIds: [4, 5] };
  const suggest = (id = 7) => fetch(`${base}/${id}/suggested-reply`);

  beforeEach(() => {
    mocks.ticketFindUnique.mockResolvedValue({ id: 7 });
    mocks.attemptFindUnique.mockResolvedValue(draft);
    mocks.replyCount.mockResolvedValue(0);
    mocks.articleFindUnique.mockResolvedValue({ id: 4, title: "Certificates" });
  });

  it("needs a session", async () => {
    mocks.getSession.mockResolvedValue(null);

    expect((await suggest()).status).toBe(401);
    expect(mocks.attemptFindUnique).not.toHaveBeenCalled();
  });

  it("is open to agents and admins", async () => {
    for (const role of [Role.AGENT, Role.ADMIN]) {
      mocks.getSession.mockResolvedValue({ user: { id: "u1", role }, session: { id: "s1" } });
      expect((await suggest()).status, role).toBe(200);
    }
  });

  it("returns the draft, its confidence and the first cited article", async () => {
    const res = await suggest();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      suggestion: { draftReply: draft.draftReply, confidence: 0.9, article: { id: 4, title: "Certificates" } },
    });
    expect(mocks.attemptFindUnique.mock.calls[0][0].where).toEqual({ ticketId: 7 });
    expect(mocks.articleFindUnique).toHaveBeenCalledWith({ where: { id: 4 }, select: { id: true, title: true } });
  });

  it("returns 404 for an unknown ticket", async () => {
    mocks.ticketFindUnique.mockResolvedValue(null);

    expect((await suggest(99)).status).toBe(404);
  });

  it("returns no suggestion when there is no attempt", async () => {
    mocks.attemptFindUnique.mockResolvedValue(null);

    const res = await suggest();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestion: null });
  });

  it("returns no suggestion for an escalation or an empty draft", async () => {
    mocks.attemptFindUnique.mockResolvedValue({ ...draft, decision: "ESCALATE", draftReply: null });
    expect(await (await suggest()).json()).toEqual({ suggestion: null });

    mocks.attemptFindUnique.mockResolvedValue({ ...draft, draftReply: "  " });
    expect(await (await suggest()).json()).toEqual({ suggestion: null });
  });

  it("returns no suggestion once the ticket has a reply, such as one the AI already sent", async () => {
    mocks.replyCount.mockResolvedValue(1);

    expect(await (await suggest()).json()).toEqual({ suggestion: null });
  });

  it("keeps the draft when the cited article was deleted or none was cited", async () => {
    mocks.articleFindUnique.mockResolvedValue(null);
    expect((await (await suggest()).json()).suggestion).toMatchObject({ draftReply: draft.draftReply, article: null });

    mocks.attemptFindUnique.mockResolvedValue({ ...draft, citedArticleIds: [] });
    mocks.articleFindUnique.mockClear();
    expect((await (await suggest()).json()).suggestion.article).toBeNull();
    expect(mocks.articleFindUnique).not.toHaveBeenCalled();
  });

  it("changes nothing: it only reads", async () => {
    await suggest();

    expect(mocks.replyCreate).not.toHaveBeenCalled();
  });
});

describe("rate limit on the AI routes", () => {
  const as = (id: string, role: Role = Role.AGENT) =>
    mocks.getSession.mockResolvedValue({ user: { id, role }, session: { id: `s-${id}` } });
  const summarise = () => fetch(`${base}/7/summary`, { method: "POST" });
  const polish = () =>
    fetch(`${base}/7/replies/polish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

  beforeEach(() => {
    mocks.ticketFindUnique.mockResolvedValue(null); // each call ends quickly in a 404, which still counts
  });

  it("allows 20 requests a minute per user, then answers 429 with a clear message, for summarise and polish together", async () => {
    as("limit-user-1");
    for (let i = 0; i < 20; i++) expect((await summarise()).status, `request ${i + 1}`).toBe(404);

    const blocked = await summarise();
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "Too many requests, please try again shortly" });
    expect(blocked.headers.get("ratelimit")).not.toBeNull();

    // One counter for all the AI routes, and it comes before the body is looked at
    expect((await polish()).status).toBe(429);
  });

  it("counts each user on their own, so one busy agent doesn't block another", async () => {
    as("limit-user-1");
    expect((await summarise()).status).toBe(429);

    as("limit-user-2");
    expect((await summarise()).status).toBe(404);
  });

  it("limits the admin re-analyse button too, and does not count an agent turned away with 403", async () => {
    as("limit-agent");
    for (let i = 0; i < 25; i++) {
      expect((await fetch(`${base}/reanalyse`, { method: "POST" })).status).toBe(403);
    }
    expect((await summarise()).status).toBe(404); // the 403s used none of this agent's allowance

    as("limit-admin", Role.ADMIN);
    for (let i = 0; i < 20; i++) {
      expect((await fetch(`${base}/reanalyse`, { method: "POST" })).status, `request ${i + 1}`).toBe(200);
    }
    expect((await fetch(`${base}/reanalyse`, { method: "POST" })).status).toBe(429);
  });

  it("does not limit the other ticket routes", async () => {
    as("limit-user-1");
    mocks.ticketFindMany.mockResolvedValue([]);
    mocks.ticketCount.mockResolvedValue(0);

    for (let i = 0; i < 30; i++) expect((await list()).status).toBe(200);
  });
});

describe("aiResolvedModes", () => {
  it("is exclude, only and include, with exclude as the default", () => {
    expect([...aiResolvedModes]).toEqual(["exclude", "only", "include"]);
    expect(ticketListQuerySchema.parse({}).aiResolved).toBe("exclude");
  });
});
