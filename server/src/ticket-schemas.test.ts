import {
  REANALYSE_LIMIT,
  TicketPriority,
  TicketSentiment,
  UNSET,
  reanalyseTicketsSchema,
  ticketListQuerySchema,
  ticketSortColumns,
  updateTicketSchema,
} from "@helpdesk/core";
import { describe, expect, it } from "vitest";

describe("ticketListQuerySchema", () => {
  it("accepts every priority and sentiment, and UNSET for tickets without one", () => {
    for (const priority of [...Object.values(TicketPriority), UNSET]) {
      expect(ticketListQuerySchema.safeParse({ priority }).success).toBe(true);
    }
    for (const sentiment of [...Object.values(TicketSentiment), UNSET]) {
      expect(ticketListQuerySchema.safeParse({ sentiment }).success).toBe(true);
    }
  });

  it("rejects unknown priority and sentiment values", () => {
    expect(ticketListQuerySchema.safeParse({ priority: "CRITICAL" }).success).toBe(false);
    expect(ticketListQuerySchema.safeParse({ sentiment: "ANGRY" }).success).toBe(false);
  });

  it("can sort by priority and sentiment", () => {
    expect(ticketSortColumns).toContain("priority");
    expect(ticketSortColumns).toContain("sentiment");
    expect(ticketListQuerySchema.parse({ sortBy: "priority", sortOrder: "desc" })).toMatchObject({ sortBy: "priority", sortOrder: "desc" });
    expect(ticketListQuerySchema.safeParse({ sortBy: "urgency" }).success).toBe(false);
  });

  it("leaves the filters out by default", () => {
    const query = ticketListQuerySchema.parse({});
    expect(query.priority).toBeUndefined();
    expect(query.sentiment).toBeUndefined();
  });
});

describe("updateTicketSchema", () => {
  it("lets an agent set or clear priority and sentiment", () => {
    expect(updateTicketSchema.parse({ priority: TicketPriority.URGENT })).toEqual({ priority: "URGENT" });
    expect(updateTicketSchema.parse({ sentiment: TicketSentiment.POSITIVE })).toEqual({ sentiment: "POSITIVE" });
    expect(updateTicketSchema.parse({ priority: null, sentiment: null })).toEqual({ priority: null, sentiment: null });
  });

  it("rejects values that are not real priorities or sentiments", () => {
    expect(updateTicketSchema.safeParse({ priority: "CRITICAL" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ sentiment: "ANGRY" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ priority: UNSET }).success).toBe(false);
  });

  it("still requires at least one field", () => {
    expect(updateTicketSchema.safeParse({}).success).toBe(false);
  });
});

describe("reanalyseTicketsSchema", () => {
  it("allows an empty body, so the server picks the oldest untagged tickets", () => {
    expect(reanalyseTicketsSchema.parse({})).toEqual({});
  });

  it("accepts up to the per-request limit of ticket ids", () => {
    const ids = Array.from({ length: REANALYSE_LIMIT }, (_, i) => i + 1);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: ids }).success).toBe(true);
  });

  it("rejects more than the limit, an empty list and ids that are not positive integers", () => {
    const tooMany = Array.from({ length: REANALYSE_LIMIT + 1 }, (_, i) => i + 1);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: tooMany }).success).toBe(false);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: [] }).success).toBe(false);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: [0] }).success).toBe(false);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: [-3] }).success).toBe(false);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: [1.5] }).success).toBe(false);
    expect(reanalyseTicketsSchema.safeParse({ ticketIds: ["7"] }).success).toBe(false);
  });
});
