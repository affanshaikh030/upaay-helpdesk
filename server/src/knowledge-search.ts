import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";
import type { KnowledgeLanguage } from "./generated/prisma/enums";

// Articles sent to the model, at most
export const KNOWLEDGE_RESULT_LIMIT = 5;

// Smallest ts_rank_cd score (normalised to 0..1, see below) an article needs to be used. When even the best article is
// under it, the AI is not called. This is a starting guess, not a measured value: with the title weighted A (1.0) and the
// content B (0.4), one matching word in the content scores about 0.29 and one in the title about 0.5, so 0.3 asks for a
// title match or several nearby content matches. Tune it from the topRank values shadow mode records
export const MIN_RETRIEVAL_RANK = 0.3;

const MAX_QUERY_TERMS = 12;
const MAX_TERM_LENGTH = 40;
// Bounds the work on an enormous text; callers already cut the body to a few thousand characters
const MAX_INPUT_LENGTH = 10_000;

// Words that say nothing about the topic, on top of Postgres's own English stop words: greetings, sign-offs and the
// filler every support email has. Without them the 12 slots go to "hello", "please" and "thanks"
const STOP_WORDS = new Set(
  (
    "a an the and or but if so of to in on at by for with from as is are was were be been am do does did have has had " +
    "i me my mine we us our you your he she it its they them their this that these those there here what which who whom " +
    "how when where why can could would should will shall may might must not no yes just very also too any some all " +
    "hi hello hey dear sir madam team support please kindly thanks thank regards sincerely best want need like know " +
    "get got able help issue problem question ticket email mail see let us use using one"
  ).split(" "),
);

// Turns untrusted ticket text into the text of a tsquery: distinct lowercase words joined with " | " (any word matches).
// The words keep only letters, digits and combining marks, so no tsquery operator, quote, bracket, colon, star, backslash
// or whitespace can survive, and the result can never be a syntax error or change what the query means. The subject comes
// first so its words win the limited slots. Returns null when nothing usable is left (then no query is run)
export function buildSearchQuery(subject: string, body: string): string | null {
  const text = `${subject.slice(0, 500)}\n${body}`.slice(0, MAX_INPUT_LENGTH).normalize("NFKC").toLowerCase();
  const terms = new Set<string>();
  for (const word of text.split(/[^\p{L}\p{N}\p{M}]+/u)) {
    // At least two characters and a letter: bare numbers and single letters only waste a slot
    if (word.length < 2 || !/\p{L}/u.test(word) || STOP_WORDS.has(word)) continue;
    terms.add(word.slice(0, MAX_TERM_LENGTH));
    if (terms.size === MAX_QUERY_TERMS) break;
  }
  return terms.size === 0 ? null : [...terms].join(" | ");
}

export interface KnowledgeMatch {
  id: number;
  title: string;
  content: string;
  language: KnowledgeLanguage | null;
  rank: number;
}

export interface KnowledgeSearchResult {
  // At most KNOWLEDGE_RESULT_LIMIT, best first, and only those at or above MIN_RETRIEVAL_RANK (none when the best is below it)
  articles: KnowledgeMatch[];
  // Best score before the minimum is applied (null when there was nothing to search for or nothing matched), kept for the audit trail
  topRank: number | null;
}

// Full-text search over knowledge_article.searchVector, an English-stemmed vector of the title (weight A) and the content
// (weight B) that Postgres keeps up to date. The ticket text only ever reaches the database as a bound parameter holding
// the sanitised words, never as part of the SQL text. Rank is ts_rank_cd with normalisation 32 (rank / (rank + 1)), so it
// is always between 0 and 1 and MIN_RETRIEVAL_RANK means the same thing however long an article is
export async function searchKnowledge(subject: string, body: string): Promise<KnowledgeSearchResult> {
  const tsquery = buildSearchQuery(subject, body);
  if (!tsquery) return { articles: [], topRank: null };

  const rows = await prisma.$queryRaw<Array<Omit<KnowledgeMatch, "rank"> & { rank: number | string }>>(Prisma.sql`
    SELECT a."id", a."title", a."content", a."language"::text AS "language",
           ts_rank_cd(a."searchVector", query, 32) AS "rank"
    FROM "knowledge_article" a, to_tsquery('english', ${tsquery}::text) AS query
    WHERE a."searchVector" @@ query
    ORDER BY "rank" DESC, a."id" ASC
    LIMIT ${KNOWLEDGE_RESULT_LIMIT}
  `);

  const matches = rows.map((row) => ({ ...row, rank: Number(row.rank) }));
  return {
    articles: matches.filter((match) => match.rank >= MIN_RETRIEVAL_RANK),
    topRank: matches[0]?.rank ?? null,
  };
}
