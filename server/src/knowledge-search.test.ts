import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("./db", () => ({ prisma: { $queryRaw: mocks.queryRaw } }));

import { buildSearchQuery, KNOWLEDGE_RESULT_LIMIT, MIN_RETRIEVAL_RANK, searchKnowledge } from "./knowledge-search";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildSearchQuery", () => {
  it("joins the distinct lowercase words with OR", () => {
    expect(buildSearchQuery("Refund policy", "How do I get a Refund for the course?")).toBe("refund | policy | course");
  });

  it("puts the subject words first and drops greetings, sign-offs and stop words", () => {
    expect(buildSearchQuery("Certificate", "Hello team, please tell me about my certificate. Thanks, Jane")).toBe("certificate | tell | about | jane");
  });

  it("keeps at most 12 words", () => {
    const body = Array.from({ length: 40 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i}`).join(" ");
    expect(buildSearchQuery("", body)?.split(" | ")).toHaveLength(12);
  });

  it("cuts a very long word", () => {
    expect(buildSearchQuery("", "x".repeat(500))).toBe("x".repeat(40));
  });

  it("drops bare numbers and single letters, and keeps words with digits", () => {
    expect(buildSearchQuery("", "order 12345 a b mp4 videos")).toBe("order | mp4 | videos");
  });

  it("returns null when nothing usable is left, so no query is run", () => {
    for (const [subject, body] of [["", ""], ["Hi", "please help, thanks!"], ["!!!", "... --- &&& |||"], ["12 34", "5 6 7"]]) {
      expect(buildSearchQuery(subject, body)).toBeNull();
    }
  });

  it("keeps Hindi and Gujarati words whole, vowel signs included", () => {
    expect(buildSearchQuery("", "रिफंड पॉलिसी વિડિયો")).toBe("रिफंड | पॉलिसी | વિડિયો");
  });

  it("never lets tsquery syntax through, whatever the ticket says", () => {
    const hostile = [
      "foo' | bar & !baz:* <-> (qux) \\ ; DROP TABLE ticket; --",
      "'; SELECT pg_sleep(10); --",
      "a & b | c ! d <2> e <-> f ( g ) h : i * j \\ k ' l \" m",
      "refund:* & !(policy) | \u0000 ​ \n\t quote's \"double\"",
      "$1 ${x} {{y}} %s %(z)s @@ ::text",
    ];
    for (const text of hostile) {
      for (const [subject, body] of [[text, ""], ["", text], [text, text]]) {
        const query = buildSearchQuery(subject, body);
        if (query === null) continue;
        // Only words and the " | " between them: every character is a letter, digit, mark or that separator
        expect(query, text).toMatch(/^[\p{L}\p{N}\p{M}]+( \| [\p{L}\p{N}\p{M}]+)*$/u);
      }
    }
  });

  it("keeps the words of a hostile text that are real words, and nothing else", () => {
    expect(buildSearchQuery("", "foo' | bar & !baz:* <-> (qux)")).toBe("foo | bar | baz | qux");
  });

  it("only reads the start of an enormous text", () => {
    const start = performance.now();
    buildSearchQuery("s", `${"lorem ipsum ".repeat(200_000)} lastword`);
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe("searchKnowledge", () => {
  const row = (id: number, rank: number | string) => ({ id, title: `Article ${id}`, content: "c", language: null, rank });

  it("runs no query when there is nothing to search for", async () => {
    await expect(searchKnowledge("Hi", "thanks!")).resolves.toEqual({ articles: [], topRank: null });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("passes the ticket text only as a bound parameter, never inside the SQL text", async () => {
    mocks.queryRaw.mockResolvedValue([]);

    await searchKnowledge("Refund' OR 1=1 --", "policy; DROP TABLE ticket");

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    const sql = mocks.queryRaw.mock.calls[0][0];
    // "or" and "ticket" are stop words, so they are not searched for
    expect(sql.values).toEqual(["refund | policy | drop | table", KNOWLEDGE_RESULT_LIMIT]);
    expect(sql.text).not.toMatch(/refund|policy|drop table|1=1/i);
    expect(sql.text).toContain("$1");
    expect(sql.text).toContain("$2");
  });

  it("ranks with ts_rank_cd normalised to 0..1, over the generated search vector, best first", async () => {
    mocks.queryRaw.mockResolvedValue([]);

    await searchKnowledge("Refund", "");

    const { text: sql } = mocks.queryRaw.mock.calls[0][0];
    expect(sql).toContain("ts_rank_cd");
    expect(sql).toContain(", 32)");
    expect(sql).toContain('"searchVector"');
    expect(sql).toContain("to_tsquery('english'");
    expect(sql).toMatch(/ORDER BY "rank" DESC/);
    expect(sql).toMatch(/LIMIT \$2/);
  });

  it("returns the articles at or above the minimum, and the best rank", async () => {
    mocks.queryRaw.mockResolvedValue([row(1, 0.62), row(2, MIN_RETRIEVAL_RANK), row(3, 0.12)]);

    const result = await searchKnowledge("Refund", "policy");

    expect(result.articles.map((a) => a.id)).toEqual([1, 2]);
    expect(result.topRank).toBe(0.62);
  });

  it("returns no articles, but still the best rank, when even the best is under the minimum", async () => {
    mocks.queryRaw.mockResolvedValue([row(1, 0.2), row(2, 0.1)]);

    await expect(searchKnowledge("Refund", "")).resolves.toEqual({ articles: [], topRank: 0.2 });
  });

  it("returns a null best rank when nothing matched", async () => {
    mocks.queryRaw.mockResolvedValue([]);

    await expect(searchKnowledge("Refund", "")).resolves.toEqual({ articles: [], topRank: null });
  });

  it("reads a rank that comes back as text", async () => {
    mocks.queryRaw.mockResolvedValue([row(1, "0.5")]);

    const result = await searchKnowledge("Refund", "");

    expect(result.articles[0].rank).toBe(0.5);
  });

  it("lets a database error through, so the queue retries the job", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("connection lost"));

    await expect(searchKnowledge("Refund", "")).rejects.toThrow("connection lost");
  });
});

describe("constants", () => {
  it("sends at most 5 articles, and the minimum is a rank between 0 and 1", () => {
    expect(KNOWLEDGE_RESULT_LIMIT).toBe(5);
    expect(MIN_RETRIEVAL_RANK).toBeGreaterThan(0);
    expect(MIN_RETRIEVAL_RANK).toBeLessThan(1);
  });
});
