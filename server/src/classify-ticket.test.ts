import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  generateText: vi.fn(),
  outputObject: vi.fn((options: unknown) => options),
}));

vi.mock("./ai", () => ({ aiModel: "test-model" }));
vi.mock("./db", () => ({ prisma: { ticket: { findUnique: mocks.findUnique, updateMany: mocks.updateMany } } }));
vi.mock("ai", () => ({ generateText: mocks.generateText, Output: { object: mocks.outputObject } }));

import { classifyTicket } from "./classify-ticket";

const baseTicket = { subject: "Refund please", body: "I was charged twice and I am furious.", category: null, sentiment: null, priority: null };
const analysis = { category: "REFUND_REQUEST", sentiment: "NEGATIVE", priority: "HIGH" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.outputObject.mockImplementation((options: unknown) => options);
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("classifyTicket", () => {
  it("does nothing for a ticket that does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await classifyTicket(1);

    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("skips a ticket that already has a category, sentiment and priority", async () => {
    mocks.findUnique.mockResolvedValue({ ...baseTicket, category: "GENERAL_QUESTION", sentiment: "NEUTRAL", priority: "LOW" });

    await classifyTicket(1);

    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("asks the model once and fills category, sentiment and priority", async () => {
    mocks.findUnique.mockResolvedValue(baseTicket);
    mocks.generateText.mockResolvedValue({ output: analysis });

    await classifyTicket(5);

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 5, category: null }, data: { category: "REFUND_REQUEST" } });
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 5, sentiment: null }, data: { sentiment: "NEGATIVE" } });
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 5, priority: null }, data: { priority: "HIGH" } });
    expect(mocks.updateMany).toHaveBeenCalledTimes(3);
  });

  it("only writes a field while it is still empty, so an agent's value is never overwritten", async () => {
    // An older ticket: classified before sentiment and priority existed
    mocks.findUnique.mockResolvedValue({ ...baseTicket, category: "GENERAL_QUESTION" });
    mocks.generateText.mockResolvedValue({ output: analysis });

    await classifyTicket(9);

    // The model ran because sentiment and priority are missing, and every write is guarded by `field: null`
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    for (const [args] of mocks.updateMany.mock.calls) {
      const guarded = Object.entries(args.where).filter(([key]) => key !== "id");
      expect(guarded).toHaveLength(1);
      expect(guarded[0][1]).toBeNull();
    }
  });

  it("asks for a structured answer that only accepts the real enum values", async () => {
    mocks.findUnique.mockResolvedValue(baseTicket);
    mocks.generateText.mockResolvedValue({ output: analysis });

    await classifyTicket(1);

    const { schema } = mocks.outputObject.mock.calls[0][0] as { schema: { safeParse: (v: unknown) => { success: boolean } } };
    expect(schema.safeParse(analysis).success).toBe(true);
    expect(schema.safeParse({ ...analysis, priority: "CRITICAL" }).success).toBe(false);
    expect(schema.safeParse({ ...analysis, sentiment: "ANGRY" }).success).toBe(false);
    expect(schema.safeParse({ ...analysis, category: "OTHER" }).success).toBe(false);
  });

  it("truncates a very long ticket before sending it to the model", async () => {
    mocks.findUnique.mockResolvedValue({ ...baseTicket, subject: "s".repeat(900), body: "b".repeat(20_000) });
    mocks.generateText.mockResolvedValue({ output: analysis });

    await classifyTicket(1);

    const { prompt } = mocks.generateText.mock.calls[0][0] as { prompt: string };
    expect(prompt.length).toBeLessThan(5_700);
  });

  it("throws on a model error and writes nothing, so the queue retries", async () => {
    mocks.findUnique.mockResolvedValue(baseTicket);
    mocks.generateText.mockRejectedValue(new Error("model unavailable"));

    await expect(classifyTicket(1)).rejects.toThrow("model unavailable");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
