import type { AddressInfo } from "node:net";
import {
  ATTEMPTS_DEFAULT_PAGE_SIZE,
  ATTEMPTS_MAX_PAGE_SIZE,
  attemptListQuerySchema,
  createKnowledgeArticleSchema,
  KNOWLEDGE_CONTENT_MAX,
  KNOWLEDGE_TITLE_MAX,
  KnowledgeLanguage,
  updateKnowledgeArticleSchema,
} from "@helpdesk/core";
import express from "express";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  attemptFindMany: vi.fn(),
  attemptCount: vi.fn(),
}));

// The real requireAuth and requireRole run; only the session lookup and the database are replaced
vi.mock("../auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("../db", () => ({
  prisma: {
    knowledgeArticle: { findMany: mocks.findMany, create: mocks.create, update: mocks.update, delete: mocks.remove },
    autoResolveAttempt: { findMany: mocks.attemptFindMany, count: mocks.attemptCount },
  },
}));

import { Prisma } from "../generated/prisma/client";
import { Role } from "../generated/prisma/enums";
import { requireAuth } from "../middleware/auth";
import { knowledgeRouter } from "./knowledge";

const article = {
  id: 3,
  title: "Refund policy",
  content: "30-day money-back guarantee.",
  language: null,
  createdAt: "2026-11-21T10:00:00.000Z",
  updatedAt: "2026-11-21T10:00:00.000Z",
};

const signedInAs = (role: Role) => mocks.getSession.mockResolvedValue({ user: { id: "u1", role }, session: { id: "s1" } });
const notFound = () => new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "test" });

// Same wiring as server/src/index.ts: json body, session required, router mounted under /api/knowledge
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", requireAuth);
  app.use("/api/knowledge", knowledgeRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/knowledge`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function send(method: string, path = "", body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("knowledge routes: access", () => {
  it("answers 401 without a session", async () => {
    mocks.getSession.mockResolvedValue(null);

    expect((await send("GET")).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("answers 403 to an agent on every route and never touches the database", async () => {
    signedInAs(Role.AGENT);

    for (const [method, path, body] of [
      ["GET", "", undefined],
      ["POST", "", { title: "T", content: "C" }],
      ["PATCH", "/3", { title: "T" }],
      ["DELETE", "/3", undefined],
      ["GET", "/attempts", undefined],
    ] as const) {
      const res = await send(method, path, body);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.attemptFindMany).not.toHaveBeenCalled();
    expect(mocks.attemptCount).not.toHaveBeenCalled();
  });

  it("checks the role before validating the body", async () => {
    signedInAs(Role.AGENT);

    expect((await send("POST", "", {})).status).toBe(403);
  });
});

describe("GET /api/knowledge", () => {
  it("lists articles for an admin, newest change first, without the search vector", async () => {
    signedInAs(Role.ADMIN);
    mocks.findMany.mockResolvedValue([article]);

    const res = await send("GET");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([article]);
    expect(mocks.findMany).toHaveBeenCalledWith({
      select: { id: true, title: true, content: true, language: true, createdAt: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  });
});

describe("POST /api/knowledge", () => {
  it("creates an article and answers 201", async () => {
    signedInAs(Role.ADMIN);
    mocks.create.mockResolvedValue(article);

    const res = await send("POST", "", { title: "  Refund policy  ", content: " 30-day money-back guarantee. ", language: KnowledgeLanguage.EN });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(article);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { title: "Refund policy", content: "30-day money-back guarantee.", language: "EN" } }),
    );
  });

  it("stores no language when none is given", async () => {
    signedInAs(Role.ADMIN);
    mocks.create.mockResolvedValue(article);

    await send("POST", "", { title: "T", content: "C" });

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: { title: "T", content: "C", language: null } }));
  });

  it("ignores fields it does not know, such as an id or the search vector", async () => {
    signedInAs(Role.ADMIN);
    mocks.create.mockResolvedValue(article);

    await send("POST", "", { id: 99, searchVector: "x", title: "T", content: "C" });

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: { title: "T", content: "C", language: null } }));
  });

  it("rejects bad input with 400 and field errors, without saving", async () => {
    signedInAs(Role.ADMIN);

    for (const body of [
      {},
      { title: "", content: "C" },
      { title: "   ", content: "C" },
      { title: "T", content: "" },
      { title: "x".repeat(KNOWLEDGE_TITLE_MAX + 1), content: "C" },
      { title: "T", content: "x".repeat(KNOWLEDGE_CONTENT_MAX + 1) },
      { title: "T", content: "C", language: "FR" },
    ]) {
      const res = await send("POST", "", body);
      expect(res.status, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
    expect(mocks.create).not.toHaveBeenCalled();

    const res = await send("POST", "", { title: "", content: "C", language: "FR" });
    const { fieldErrors } = await res.json();
    expect(fieldErrors.title).toEqual(["Title is required"]);
    expect(fieldErrors.language).toBeDefined();
  });
});

describe("PATCH /api/knowledge/:id", () => {
  it("updates only what was sent", async () => {
    signedInAs(Role.ADMIN);
    mocks.update.mockResolvedValue({ ...article, title: "New title" });

    const res = await send("PATCH", "/3", { title: "New title" });

    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("New title");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3 }, data: { title: "New title" } }));
  });

  it("clears the language when it is null", async () => {
    signedInAs(Role.ADMIN);
    mocks.update.mockResolvedValue(article);

    await send("PATCH", "/3", { language: null });

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { language: null } }));
  });

  it("rejects an empty body, a blank title and an unknown language with 400", async () => {
    signedInAs(Role.ADMIN);

    for (const body of [{}, { title: "  " }, { content: "" }, { language: "FR" }]) {
      expect((await send("PATCH", "/3", body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("answers 404 for a missing article and for an id that is not a positive integer", async () => {
    signedInAs(Role.ADMIN);
    mocks.update.mockRejectedValue(notFound());

    expect((await send("PATCH", "/999", { title: "T" })).status).toBe(404);
    expect((await send("PATCH", "/abc", { title: "T" })).status).toBe(404);
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: -1 } }));
  });
});

describe("DELETE /api/knowledge/:id", () => {
  it("deletes the article and answers 204", async () => {
    signedInAs(Role.ADMIN);
    mocks.remove.mockResolvedValue(article);

    const res = await send("DELETE", "/3");

    expect(res.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("answers 404 for a missing article", async () => {
    signedInAs(Role.ADMIN);
    mocks.remove.mockRejectedValue(notFound());

    expect((await send("DELETE", "/999")).status).toBe(404);
  });
});

describe("GET /api/knowledge/attempts", () => {
  const attempt = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    ticketId: 12,
    ticket: { subject: "Do you offer certificates?" },
    decision: "RESOLVE",
    reason: "RESOLVED",
    topRank: 0.7,
    confidence: 0.92,
    draftReply: "Hi Jane, yes.",
    citedArticleIds: [4],
    shadow: true,
    acted: false,
    createdAt: "2026-11-21T10:00:00.000Z",
    ...overrides,
  });

  it("lists attempts newest first with the ticket subject, decision, reason, ranks and draft reply", async () => {
    signedInAs(Role.ADMIN);
    mocks.attemptFindMany.mockResolvedValue([attempt()]);
    mocks.attemptCount.mockResolvedValue(41);
    mocks.findMany.mockResolvedValue([{ id: 4, title: "Certificates" }]);

    const res = await send("GET", "/attempts");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      attempts: [
        {
          id: 1,
          ticketId: 12,
          ticketSubject: "Do you offer certificates?",
          decision: "RESOLVE",
          reason: "RESOLVED",
          topRank: 0.7,
          confidence: 0.92,
          draftReply: "Hi Jane, yes.",
          citedArticles: [{ id: 4, title: "Certificates" }],
          shadow: true,
          acted: false,
          createdAt: "2026-11-21T10:00:00.000Z",
        },
      ],
      total: 41,
    });
    expect(mocks.attemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: 0, take: ATTEMPTS_DEFAULT_PAGE_SIZE }),
    );
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { id: { in: [4] } }, select: { id: true, title: true } });
  });

  it("selects only what it shows: the ticket's subject, not its body or the sender", async () => {
    signedInAs(Role.ADMIN);
    mocks.attemptFindMany.mockResolvedValue([]);
    mocks.attemptCount.mockResolvedValue(0);

    await send("GET", "/attempts");

    const { select } = mocks.attemptFindMany.mock.calls[0][0];
    expect(select.ticket).toEqual({ select: { subject: true } });
    expect(Object.keys(select).sort()).toEqual(
      ["acted", "citedArticleIds", "confidence", "createdAt", "decision", "draftReply", "id", "reason", "shadow", "ticket", "ticketId", "topRank"].sort(),
    );
  });

  it("pages with page and pageSize", async () => {
    signedInAs(Role.ADMIN);
    mocks.attemptFindMany.mockResolvedValue([]);
    mocks.attemptCount.mockResolvedValue(0);

    await send("GET", "/attempts?page=3&pageSize=5");

    expect(mocks.attemptFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 5 }));
  });

  it("shows a null title for a cited article that was deleted, and looks each title up once", async () => {
    signedInAs(Role.ADMIN);
    mocks.attemptFindMany.mockResolvedValue([attempt({ citedArticleIds: [4, 9] }), attempt({ id: 2, citedArticleIds: [4] })]);
    mocks.attemptCount.mockResolvedValue(2);
    mocks.findMany.mockResolvedValue([{ id: 4, title: "Certificates" }]);

    const body = await (await send("GET", "/attempts")).json();

    expect(body.attempts[0].citedArticles).toEqual([
      { id: 4, title: "Certificates" },
      { id: 9, title: null },
    ]);
    expect(body.attempts[1].citedArticles).toEqual([{ id: 4, title: "Certificates" }]);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { id: { in: [4, 9] } }, select: { id: true, title: true } });
  });

  it("looks up no titles when nothing was cited (escalations before the model)", async () => {
    signedInAs(Role.ADMIN);
    mocks.attemptFindMany.mockResolvedValue([attempt({ citedArticleIds: [], decision: "ESCALATE", reason: "URGENT", topRank: null, confidence: null, draftReply: null })]);
    mocks.attemptCount.mockResolvedValue(1);

    const body = await (await send("GET", "/attempts")).json();

    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(body.attempts[0]).toMatchObject({ citedArticles: [], reason: "URGENT", topRank: null, confidence: null, draftReply: null });
  });

  it("rejects a bad page or pageSize with 400", async () => {
    signedInAs(Role.ADMIN);

    for (const query of ["page=0", "page=abc", "pageSize=0", `pageSize=${ATTEMPTS_MAX_PAGE_SIZE + 1}`]) {
      expect((await send("GET", `/attempts?${query}`)).status, query).toBe(400);
    }
    expect(mocks.attemptFindMany).not.toHaveBeenCalled();
  });

});

describe("attemptListQuerySchema", () => {
  it("defaults to the first page of 20 and accepts the limits", () => {
    expect(attemptListQuerySchema.parse({})).toEqual({ page: 1, pageSize: ATTEMPTS_DEFAULT_PAGE_SIZE });
    expect(attemptListQuerySchema.safeParse({ page: "2", pageSize: String(ATTEMPTS_MAX_PAGE_SIZE) }).success).toBe(true);
  });
});

describe("knowledge article schemas", () => {
  it("accepts the length limits exactly", () => {
    const ok = { title: "x".repeat(KNOWLEDGE_TITLE_MAX), content: "y".repeat(KNOWLEDGE_CONTENT_MAX) };

    expect(createKnowledgeArticleSchema.safeParse(ok).success).toBe(true);
    expect(updateKnowledgeArticleSchema.safeParse(ok).success).toBe(true);
  });

  it("accepts every language and null, and defaults to null on create", () => {
    for (const language of [...Object.values(KnowledgeLanguage), null]) {
      expect(createKnowledgeArticleSchema.safeParse({ title: "T", content: "C", language }).success).toBe(true);
    }
    expect(createKnowledgeArticleSchema.parse({ title: "T", content: "C" }).language).toBeNull();
  });
});
