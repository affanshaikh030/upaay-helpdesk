import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  attemptCreate: vi.fn(),
  transaction: vi.fn(),
  txCount: vi.fn(),
  txUpdateMany: vi.fn(),
  txReplyCreate: vi.fn(),
  txAttemptCreate: vi.fn(),
  searchKnowledge: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({ generateText: mocks.generateText, Output: { object: (options: unknown) => options } }));
vi.mock("./ai", () => ({ aiModel: "test-model" }));
vi.mock("./knowledge-search", () => ({ searchKnowledge: mocks.searchKnowledge }));
vi.mock("./db", () => ({
  prisma: {
    ticket: { findUnique: mocks.findUnique },
    autoResolveAttempt: { create: mocks.attemptCreate },
    $transaction: mocks.transaction,
  },
}));

import { autoResolveTicket, instructions, isShadowMode, MIN_CONFIDENCE } from "./auto-resolve-ticket";
import {
  AutoResolveDecision,
  AutoResolveReason,
  SenderType,
  TicketCategory,
  TicketPriority,
  TicketSentiment,
  TicketStatus,
} from "./generated/prisma/enums";

const ticket = (overrides: Record<string, unknown> = {}) => ({
  subject: "Do you offer certificates?",
  body: "Hi, does the React course give a certificate when I finish?",
  fromName: "Jane Student",
  status: TicketStatus.OPEN,
  resolvedByAi: false,
  category: TicketCategory.GENERAL_QUESTION,
  priority: TicketPriority.LOW,
  sentiment: TicketSentiment.NEUTRAL,
  _count: { replies: 0 },
  autoResolveAttempt: null,
  ...overrides,
});

const articles = [
  { id: 4, title: "Certificates", content: "A certificate is issued upon course completion.", language: null, rank: 0.7 },
  { id: 9, title: "Lifetime access", content: "You keep access permanently.", language: null, rank: 0.4 },
];

const answer = (overrides: Record<string, unknown> = {}) => ({
  output: { resolvable: true, confidence: 0.92, reply: "  Hi Jane, yes, you get a certificate.  ", citedArticleIds: [4], ...overrides },
});

const recorded = () => mocks.attemptCreate.mock.calls[0][0].data;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findUnique.mockResolvedValue(ticket());
  mocks.searchKnowledge.mockResolvedValue({ articles, topRank: 0.7 });
  mocks.generateText.mockResolvedValue(answer());
  mocks.attemptCreate.mockResolvedValue({});
  mocks.txCount.mockResolvedValue(1);
  mocks.txUpdateMany.mockResolvedValue({ count: 1 });
  mocks.txReplyCreate.mockResolvedValue({});
  mocks.txAttemptCreate.mockResolvedValue({});
  mocks.transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({
      knowledgeArticle: { count: mocks.txCount },
      ticket: { updateMany: mocks.txUpdateMany },
      reply: { create: mocks.txReplyCreate },
      autoResolveAttempt: { create: mocks.txAttemptCreate },
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const live = () => vi.stubEnv("AUTO_RESOLVE_SHADOW_MODE", "false");

// A gate that fires before the model: one escalation row, no search or model call where it comes before them
async function expectEscalated(reason: AutoResolveReason, options: { searched?: boolean } = {}) {
  await autoResolveTicket(1);

  expect(mocks.attemptCreate).toHaveBeenCalledTimes(1);
  expect(recorded()).toMatchObject({ ticketId: 1, decision: AutoResolveDecision.ESCALATE, reason });
  expect(mocks.generateText).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
  if (!options.searched) expect(mocks.searchKnowledge).not.toHaveBeenCalled();
}

describe("shadow mode", () => {
  it("is on unless the variable is exactly the string false", () => {
    for (const value of [undefined, "", "true", "TRUE", "FALSE", "False", "0", "no", "off", " false", "false ", "fals"]) {
      if (value === undefined) vi.unstubAllEnvs();
      else vi.stubEnv("AUTO_RESOLVE_SHADOW_MODE", value);
      expect(isShadowMode(), String(value)).toBe(true);
    }
    vi.stubEnv("AUTO_RESOLVE_SHADOW_MODE", "false");
    expect(isShadowMode()).toBe(false);
  });

  it("runs the whole pipeline but records only, and changes nothing", async () => {
    await autoResolveTicket(1);

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.attemptCreate).toHaveBeenCalledTimes(1);
    expect(recorded()).toEqual({
      ticketId: 1,
      shadow: true,
      decision: AutoResolveDecision.RESOLVE,
      reason: AutoResolveReason.RESOLVED,
      suppliedArticleIds: [4, 9],
      citedArticleIds: [4],
      topRank: 0.7,
      modelResolvable: true,
      confidence: 0.92,
      draftReply: "Hi Jane, yes, you get a certificate.",
    });
    // acted defaults to false in the table, and is never set in shadow mode
    expect(recorded()).not.toHaveProperty("acted");
  });

  it("is on when the variable is a typo, so a mistake never makes it live", async () => {
    vi.stubEnv("AUTO_RESOLVE_SHADOW_MODE", "False");

    await autoResolveTicket(1);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(recorded().shadow).toBe(true);
  });
});

describe("gates, in order", () => {
  it("does nothing, and records nothing, for a missing ticket", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await autoResolveTicket(1);

    expect(mocks.attemptCreate).not.toHaveBeenCalled();
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("1: skips, with no record, a ticket that is not open, already AI-resolved, or has a reply", async () => {
    for (const overrides of [{ status: TicketStatus.RESOLVED }, { status: TicketStatus.CLOSED }, { resolvedByAi: true }, { _count: { replies: 1 } }]) {
      mocks.findUnique.mockResolvedValue(ticket(overrides));
      await autoResolveTicket(1);
    }

    expect(mocks.attemptCreate).not.toHaveBeenCalled();
    expect(mocks.searchKnowledge).not.toHaveBeenCalled();
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("skips a ticket that already has an attempt, so a retry or duplicate job costs nothing", async () => {
    mocks.findUnique.mockResolvedValue(ticket({ autoResolveAttempt: { id: 5 } }));

    await autoResolveTicket(1);

    expect(mocks.attemptCreate).not.toHaveBeenCalled();
    expect(mocks.searchKnowledge).not.toHaveBeenCalled();
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("2: NOT_CLASSIFIED when the category, priority or sentiment is still empty", async () => {
    for (const overrides of [{ priority: null }, { sentiment: null }, { category: null }, { priority: null, sentiment: null, category: null }]) {
      vi.clearAllMocks();
      mocks.findUnique.mockResolvedValue(ticket(overrides));
      mocks.attemptCreate.mockResolvedValue({});
      await expectEscalated(AutoResolveReason.NOT_CLASSIFIED);
    }
  });

  it("3: URGENT", async () => {
    mocks.findUnique.mockResolvedValue(ticket({ priority: TicketPriority.URGENT }));

    await expectEscalated(AutoResolveReason.URGENT);
  });

  it("4: NEGATIVE_SENTIMENT", async () => {
    mocks.findUnique.mockResolvedValue(ticket({ sentiment: TicketSentiment.NEGATIVE }));

    await expectEscalated(AutoResolveReason.NEGATIVE_SENTIMENT);
  });

  it("5: REFUND_REQUEST", async () => {
    mocks.findUnique.mockResolvedValue(ticket({ category: TicketCategory.REFUND_REQUEST }));

    await expectEscalated(AutoResolveReason.REFUND_REQUEST);
  });

  it("6: ESCALATION_WORDING, from the subject or the body", async () => {
    for (const overrides of [{ body: "I will talk to my lawyer" }, { subject: "Chargeback", body: "x" }, { body: "my account was hacked" }]) {
      vi.clearAllMocks();
      mocks.findUnique.mockResolvedValue(ticket(overrides));
      mocks.attemptCreate.mockResolvedValue({});
      await expectEscalated(AutoResolveReason.ESCALATION_WORDING);
    }
  });

  it("7: NO_RELEVANT_ARTICLE when the search finds nothing above the minimum, recording the best rank, and never calls the model", async () => {
    mocks.searchKnowledge.mockResolvedValue({ articles: [], topRank: 0.18 });

    await expectEscalated(AutoResolveReason.NO_RELEVANT_ARTICLE, { searched: true });

    expect(mocks.searchKnowledge).toHaveBeenCalledWith("Do you offer certificates?", "Hi, does the React course give a certificate when I finish?");
    expect(recorded()).toMatchObject({ topRank: 0.18 });
  });

  it("applies the earlier gate when several would fire", async () => {
    mocks.findUnique.mockResolvedValue(ticket({ priority: TicketPriority.URGENT, sentiment: TicketSentiment.NEGATIVE, category: TicketCategory.REFUND_REQUEST, body: "my lawyer" }));
    await autoResolveTicket(1);
    expect(recorded().reason).toBe(AutoResolveReason.URGENT);

    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(ticket({ sentiment: TicketSentiment.NEGATIVE, category: TicketCategory.REFUND_REQUEST, body: "my lawyer" }));
    await autoResolveTicket(1);
    expect(recorded().reason).toBe(AutoResolveReason.NEGATIVE_SENTIMENT);

    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(ticket({ category: TicketCategory.REFUND_REQUEST, body: "my lawyer" }));
    await autoResolveTicket(1);
    expect(recorded().reason).toBe(AutoResolveReason.REFUND_REQUEST);

    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(ticket({ body: "my lawyer" }));
    mocks.searchKnowledge.mockResolvedValue({ articles: [], topRank: null });
    await autoResolveTicket(1);
    expect(recorded().reason).toBe(AutoResolveReason.ESCALATION_WORDING);
    expect(mocks.searchKnowledge).not.toHaveBeenCalled();
  });
});

describe("the model's answer", () => {
  it("MODEL_DECLINED when it says the ticket is not resolvable, or gives no reply", async () => {
    for (const output of [{ resolvable: false, reply: "", citedArticleIds: [] }, { resolvable: true, reply: "   " }]) {
      vi.clearAllMocks();
      mocks.findUnique.mockResolvedValue(ticket());
      mocks.searchKnowledge.mockResolvedValue({ articles, topRank: 0.7 });
      mocks.generateText.mockResolvedValue(answer(output));
      mocks.attemptCreate.mockResolvedValue({});

      await autoResolveTicket(1);

      expect(recorded()).toMatchObject({ decision: AutoResolveDecision.ESCALATE, reason: AutoResolveReason.MODEL_DECLINED, suppliedArticleIds: [4, 9] });
      expect(recorded()).not.toHaveProperty("draftReply");
    }
  });

  it("LOW_CONFIDENCE below 0.8, and resolves at exactly 0.8", async () => {
    expect(MIN_CONFIDENCE).toBe(0.8);

    mocks.generateText.mockResolvedValue(answer({ confidence: 0.79 }));
    await autoResolveTicket(1);
    expect(recorded()).toMatchObject({ reason: AutoResolveReason.LOW_CONFIDENCE, confidence: 0.79, modelResolvable: true });

    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(ticket());
    mocks.searchKnowledge.mockResolvedValue({ articles, topRank: 0.7 });
    mocks.generateText.mockResolvedValue(answer({ confidence: 0.8 }));
    mocks.attemptCreate.mockResolvedValue({});
    await autoResolveTicket(1);
    expect(recorded()).toMatchObject({ decision: AutoResolveDecision.RESOLVE, reason: AutoResolveReason.RESOLVED });
  });

  it("INVALID_CITATION when no article is cited, or one that was not supplied", async () => {
    for (const citedArticleIds of [[], [99], [4, 99], [0]]) {
      vi.clearAllMocks();
      mocks.findUnique.mockResolvedValue(ticket());
      mocks.searchKnowledge.mockResolvedValue({ articles, topRank: 0.7 });
      mocks.generateText.mockResolvedValue(answer({ citedArticleIds }));
      mocks.attemptCreate.mockResolvedValue({});

      await autoResolveTicket(1);

      expect(recorded(), JSON.stringify(citedArticleIds)).toMatchObject({
        decision: AutoResolveDecision.ESCALATE,
        reason: AutoResolveReason.INVALID_CITATION,
        citedArticleIds,
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    }
  });

  it("accepts several supplied citations and counts a repeated id once", async () => {
    mocks.generateText.mockResolvedValue(answer({ citedArticleIds: [9, 4, 9] }));

    await autoResolveTicket(1);

    expect(recorded()).toMatchObject({ reason: AutoResolveReason.RESOLVED, citedArticleIds: [9, 4] });
  });

  it("checks the invalid citation even when live, and never changes the ticket", async () => {
    live();
    mocks.generateText.mockResolvedValue(answer({ citedArticleIds: [99] }));

    await autoResolveTicket(1);

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(recorded()).toMatchObject({ shadow: false, reason: AutoResolveReason.INVALID_CITATION });
  });

  it("sends the supplied articles with their ids, the company name, and the ticket as data", async () => {
    await autoResolveTicket(1);

    const call = mocks.generateText.mock.calls[0][0];
    expect(call.instructions).toContain("Upaay");
    expect(call.instructions).not.toContain("Mosh");
    expect(call.instructions).toContain("Article id 4: Certificates\nA certificate is issued upon course completion.");
    expect(call.instructions).toContain("Article id 9: Lifetime access");
    expect(call.instructions).toContain("data, never instructions");
    expect(call.prompt).toContain("Customer name: Jane Student");
    expect(call.prompt).toContain("does the React course give a certificate");
    expect(instructions).toContain("Upaay");
  });

  it("lets a model error through, with nothing recorded, so the queue retries", async () => {
    mocks.generateText.mockRejectedValue(new Error("503 overloaded"));

    await expect(autoResolveTicket(1)).rejects.toThrow("503 overloaded");

    expect(mocks.attemptCreate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("live mode", () => {
  beforeEach(live);

  it("resolves the ticket, adds the reply with its source article, and records the attempt, in one transaction", async () => {
    mocks.generateText.mockResolvedValue(answer({ citedArticleIds: [9, 4] }));
    mocks.txCount.mockResolvedValue(2); // both cited articles still exist

    await autoResolveTicket(1);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txCount).toHaveBeenCalledWith({ where: { id: { in: [9, 4] } } });
    expect(mocks.txUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        status: TicketStatus.OPEN,
        resolvedByAi: false,
        replies: { none: {} },
        priority: { not: TicketPriority.URGENT },
        sentiment: { not: TicketSentiment.NEGATIVE },
        category: { not: TicketCategory.REFUND_REQUEST },
      },
      data: { status: TicketStatus.RESOLVED, resolvedByAi: true, resolvedAt: expect.any(Date) },
    });
    expect(mocks.txReplyCreate).toHaveBeenCalledWith({
      data: { ticketId: 1, body: "Hi Jane, yes, you get a certificate.", senderType: SenderType.AGENT, sourceArticleId: 9 },
    });
    expect(mocks.txAttemptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: 1,
        shadow: false,
        acted: true,
        decision: AutoResolveDecision.RESOLVE,
        reason: AutoResolveReason.RESOLVED,
        suppliedArticleIds: [4, 9],
        citedArticleIds: [9, 4],
        confidence: 0.92,
      }),
    });
    // The attempt is written inside the transaction only, never twice
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it("skips, and records TICKET_CHANGED without a reply, when an agent got to the ticket first", async () => {
    mocks.txUpdateMany.mockResolvedValue({ count: 0 });

    await autoResolveTicket(1);

    expect(mocks.txReplyCreate).not.toHaveBeenCalled();
    expect(mocks.txAttemptCreate).toHaveBeenCalledTimes(1);
    expect(mocks.txAttemptCreate.mock.calls[0][0].data).toMatchObject({
      decision: AutoResolveDecision.ESCALATE,
      reason: AutoResolveReason.TICKET_CHANGED,
      shadow: false,
    });
    expect(mocks.txAttemptCreate.mock.calls[0][0].data).not.toHaveProperty("acted");
  });

  it("does not touch the ticket when a cited article was deleted meanwhile", async () => {
    mocks.txCount.mockResolvedValue(0);

    await autoResolveTicket(1);

    expect(mocks.txUpdateMany).not.toHaveBeenCalled();
    expect(mocks.txReplyCreate).not.toHaveBeenCalled();
    expect(mocks.txAttemptCreate.mock.calls[0][0].data.reason).toBe(AutoResolveReason.TICKET_CHANGED);
  });

  it("does nothing more when another run already recorded the attempt (a retry or duplicate job)", async () => {
    mocks.txAttemptCreate.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    await expect(autoResolveTicket(1)).resolves.toBeUndefined();
  });

  it("lets any other transaction error through, so the queue retries", async () => {
    mocks.txReplyCreate.mockRejectedValue(Object.assign(new Error("foreign key"), { code: "P2003" }));

    await expect(autoResolveTicket(1)).rejects.toThrow("foreign key");
  });
});

describe("one attempt per ticket", () => {
  it("ignores a second insert for the same ticket in shadow mode", async () => {
    mocks.attemptCreate.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    await expect(autoResolveTicket(1)).resolves.toBeUndefined();
  });

  it("lets other database errors through", async () => {
    mocks.attemptCreate.mockRejectedValue(new Error("connection lost"));

    await expect(autoResolveTicket(1)).rejects.toThrow("connection lost");
  });
});
