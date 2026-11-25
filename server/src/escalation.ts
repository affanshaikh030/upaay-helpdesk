// Wording that always sends a ticket to a human, checked in code before the AI is called. The prompt repeats these rules,
// but this list doesn't depend on the model following them. It is a safety net, not a classifier: it errs towards
// escalating (a false match only costs a human a look), and it can be evaded by deliberate misspelling

export const EscalationCategory = {
  LEGAL: "LEGAL",
  CHARGEBACK_DISPUTE: "CHARGEBACK_DISPUTE",
  SECURITY: "SECURITY",
  REFUND: "REFUND",
} as const;

export type EscalationCategory = (typeof EscalationCategory)[keyof typeof EscalationCategory];

// A term made only of ASCII is matched as whole words (so "sue" is never found inside "issue"); a space in it matches any
// run of spaces or hyphens ("charge back", "charge-back"). Terms in Hindi or Gujarati are matched as substrings, because
// those words take endings and have no reliable word boundary. Only some inflections are listed on purpose: list the
// forms you want, nothing is stemmed
export const ESCALATION_TERMS: Record<EscalationCategory, readonly string[]> = {
  LEGAL: [
    "legal", "illegal", "legally", "lawyer", "lawyers", "attorney", "attorneys", "solicitor", "advocate", "lawsuit", "lawsuits",
    "to sue", "will sue", "i'll sue", "we'll sue", "can sue", "sue you", "sue us", "sue the company", "suing", "sued",
    "court", "courts", "consumer court", "consumer forum", "consumer protection", "small claims", "class action",
    "defamation", "legal action", "legal notice", "police", "fir",
    // Hindi
    "वकील", "कानूनी", "कानून", "अदालत", "कोर्ट", "मुकदमा", "पुलिस", "नोटिस",
    // Gujarati
    "વકીલ", "કાનૂની", "કાયદેસર", "કોર્ટ", "અદાલત", "પોલીસ", "નોટિસ",
    // Hindi/Gujarati written in English letters
    "vakil", "kanooni",
  ],
  CHARGEBACK_DISPUTE: [
    "chargeback", "chargebacks", "charge back", "charged back", "dispute", "disputes", "disputed", "disputing",
    "unauthorized charge", "unauthorised charge", "unauthorized transaction", "unauthorised transaction",
    "unauthorized payment", "unauthorised payment", "card issuer", "reverse the charge", "reverse the payment",
    "reversal", "payment reversal", "reverse the transaction",
    // Hindi
    "चार्जबैक", "चार्ज बैक", "विवाद",
    // Gujarati
    "ચાર્જબેક", "ચાર્જ બેક", "વિવાદ",
    // Hindi/Gujarati written in English letters
    "chargeback karunga",
  ],
  SECURITY: [
    "hack", "hacked", "hacker", "hackers", "hacking", "compromised", "breach", "breached", "data breach", "security",
    "unauthorized access", "unauthorised access", "someone logged in", "someone else logged in", "someone else has access",
    "stolen", "theft", "phishing", "vulnerability", "suspicious", "fraud", "fraudulent", "scam", "scammed", "identity theft",
    "password leaked", "leaked",
    // Hindi
    "हैक", "धोखाधड़ी", "धोखा", "चोरी", "सुरक्षा",
    // Gujarati
    "હેક", "છેતરપિંડી", "છેતરપિંડ", "ચોરી", "સુરક્ષા",
    // Hindi/Gujarati written in English letters
    "dhokha", "dhokhadhadi",
  ],
  // Money back. A ticket that only mentions a refund (even a policy question) goes to a human too: the category the AI
  // assigns can be wrong, or steered by the ticket's own text, so this doesn't depend on it
  REFUND: [
    "refund", "refunds", "refunded", "refunding", "refundable", "money back", "moneyback", "my money", "get my money",
    "give back my money", "reimburse", "reimbursed", "reimbursement", "repay", "repayment", "cancel and refund",
    "return my payment",
    // Hindi
    "रिफंड", "रिफ़ंड", "रिफण्ड", "पैसे वापस", "पैसा वापस", "रुपये वापस", "रकम वापस", "राशि वापस", "धन वापसी", "धनवापसी",
    "भुगतान वापस", "पैसे लौटा", "पैसा लौटा",
    // Gujarati
    "રિફંડ", "રિફન્ડ", "પૈસા પાછા", "પૈસા પરત", "રકમ પરત", "નાણાં પરત", "નાણા પરત", "ચૂકવણી પરત",
    // Hindi/Gujarati written in English letters
    "paisa wapas", "paise wapas", "paisa vapas", "paise vapas", "paise lautao", "paisa lautao", "paise return",
    "rupaye wapas", "rakam wapas", "amount wapas", "payment wapas", "money wapas", "refund chahiye", "refund chahie",
    "refund do", "refund kar do", "refund karo", "refund dijiye", "paisa pacho", "paisa parat",
  ],
};

// Longer than any real ticket after the caller's own limits; stops an enormous text from costing time
const MAX_TEXT_LENGTH = 20_000;

const isAscii = (term: string) => /^[\x20-\x7e]+$/.test(term);
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The text is NFKC-normalised before matching, so a term is too: otherwise a letter stored in its precomposed form
// (for example Devanagari "फ़") would never match
function compile(rawTerm: string): RegExp {
  const term = rawTerm.normalize("NFKC");
  const source = escapeRegExp(term).replace(/ /g, "[\\s-]+");
  return isAscii(term) ? new RegExp(`(?<![\\p{L}\\p{N}])${source}(?![\\p{L}\\p{N}])`, "iu") : new RegExp(source, "u");
}

const rules = (Object.entries(ESCALATION_TERMS) as [EscalationCategory, readonly string[]][]).map(
  ([category, terms]) => ({ category, patterns: terms.map(compile) }),
);

// The first category that matches (legal, then chargeback or dispute, then security), or null for none. Pure
export function detectEscalation(...texts: string[]): EscalationCategory | null {
  const text = texts
    .join("\n")
    .slice(0, MAX_TEXT_LENGTH)
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .toLowerCase();
  for (const { category, patterns } of rules) {
    if (patterns.some((pattern) => pattern.test(text))) return category;
  }
  return null;
}

// ---- Checking the model's draft reply (after the model, before a reply is accepted) ----
// The ticket text is untrusted, so a draft can contain something the articles never said. A link, an email address or a
// money promise that the cited articles don't contain is blocked, and the ticket goes to a human. Pure

export const ReplyProblem = {
  UNSUPPORTED_CONTACT: "UNSUPPORTED_CONTACT",
  MONEY_COMMITMENT: "MONEY_COMMITMENT",
} as const;

export type ReplyProblem = (typeof ReplyProblem)[keyof typeof ReplyProblem];

// The model's reply is cut to 10,000 characters by the caller; articles are limited too, so the scans stay cheap
const MAX_REPLY_LENGTH = 10_000;
const MAX_ARTICLE_LENGTH = 200_000;

const normalizeText = (text: string) => text.normalize("NFKC").replace(/[‘’]/g, "'").toLowerCase();

// Every pattern starts at the beginning of a token (the lookbehinds), so scanning a long run of letters stays linear
const EMAIL = /(?<![a-z0-9._%+-])[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/g;
const LINK = /(?:https?:\/\/|www\.)[^\s<>"'`]+|(?<![a-z0-9@._-])(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?/g;

// A link compares without its scheme, "www." and trailing punctuation or slash, so "https://www.upaay.com/help." and
// "upaay.com/help" are the same address
const stripScheme = (text: string) => text.replace(/https?:\/\/(?:www\.)?/g, "").replace(/\bwww\./g, "");
const normalizeLink = (link: string) =>
  stripScheme(link).replace(/[.,;:!?)\]}>"'`]+$/, "").replace(/\/+$/, "");

// The address has to appear whole in the articles: "evil.com" is not supported by "devil.com", "a.com/x" not by "a.com/xy",
// and "a@b.com" not by "a@b.com.au"
function appearsIn(articles: string, address: string): boolean {
  return new RegExp(`(?<![a-z0-9._%+-])${escapeRegExp(address)}(?!\\.?[a-z0-9-])`).test(articles);
}

// Money words in the reply's language. A pattern only counts when the cited articles don't use it themselves
const moneyTerms = (terms: string[]) => terms.map((term) => new RegExp(escapeRegExp(term.normalize("NFKC")), "u"));
const MONEY_PATTERNS: RegExp[] = [
  /\brefund\w*/u,
  /\breimburs\w*/u,
  /\bcredit(?:s|ed|ing)?\b/u,
  /\bcompensat\w*/u,
  /\bmoney[\s-]*back\b/u,
  /\bwaiv\w*/u,
  /\bfree[\s-]+of[\s-]+(?:any[\s-]+)?charge\b/u,
  /\bno[\s-]+(?:extra[\s-]+|additional[\s-]+)?(?:charge|cost|fee)s?\b/u,
  // Hindi. "माफ़ कीजिए" (sorry) is deliberately not listed, only waiving a fee
  ...moneyTerms([
    "रिफंड", "रिफ़ंड", "रिफण्ड", "पैसे वापस", "पैसा वापस", "रुपये वापस", "रकम वापस", "राशि वापस", "मुआवज़ा", "मुआवजा",
    "क्षतिपूर्ति", "क्रेडिट", "शुल्क माफ", "फीस माफ", "चार्ज माफ", "निःशुल्क", "नि:शुल्क", "बिना किसी शुल्क",
  ]),
  // Gujarati. "માફ કરશો" (sorry) is deliberately not listed either
  ...moneyTerms([
    "રિફંડ", "રિફન્ડ", "પૈસા પાછા", "પૈસા પરત", "રકમ પરત", "વળતર", "ક્રેડિટ", "ફી માફ", "શુલ્ક માફ", "ચાર્જ માફ", "નિઃશુલ્ક",
    "નિ:શુલ્ક", "કોઈ ચાર્જ વગર",
  ]),
];

// `citedTexts` is the title and content of the articles the model cited. Returns the first problem, or null when the
// reply only contains addresses and money wording that those articles contain too
export function checkDraftReply(reply: string, citedTexts: readonly string[]): ReplyProblem | null {
  const text = normalizeText(reply.slice(0, MAX_REPLY_LENGTH));
  const articles = normalizeText(citedTexts.join("\n").slice(0, MAX_ARTICLE_LENGTH));
  const articleLinks = stripScheme(articles);

  const emails = text.match(EMAIL) ?? [];
  if (emails.some((email) => !appearsIn(articles, email))) return ReplyProblem.UNSUPPORTED_CONTACT;

  // Emails are taken out first, so their domain isn't read as a link of its own
  const links = (text.replace(EMAIL, " ").match(LINK) ?? []).map(normalizeLink).filter(Boolean);
  if (links.some((link) => !appearsIn(articleLinks, link))) return ReplyProblem.UNSUPPORTED_CONTACT;

  if (MONEY_PATTERNS.some((pattern) => pattern.test(text) && !pattern.test(articles))) return ReplyProblem.MONEY_COMMITMENT;
  return null;
}
