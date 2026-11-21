// Wording that always sends a ticket to a human, checked in code before the AI is called. The prompt repeats these rules,
// but this list doesn't depend on the model following them. It is a safety net, not a classifier: it errs towards
// escalating (a false match only costs a human a look), and it can be evaded by deliberate misspelling

export const EscalationCategory = {
  LEGAL: "LEGAL",
  CHARGEBACK_DISPUTE: "CHARGEBACK_DISPUTE",
  SECURITY: "SECURITY",
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
    // Hindi
    "चार्जबैक", "विवाद",
    // Gujarati
    "ચાર્જબેક", "વિવાદ",
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
};

// Longer than any real ticket after the caller's own limits; stops an enormous text from costing time
const MAX_TEXT_LENGTH = 20_000;

const isAscii = (term: string) => /^[\x20-\x7e]+$/.test(term);
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(term: string): RegExp {
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
