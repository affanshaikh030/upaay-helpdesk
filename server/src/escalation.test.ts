import { describe, expect, it } from "vitest";
import { detectEscalation, ESCALATION_TERMS, EscalationCategory } from "./escalation";

describe("detectEscalation", () => {
  it("lets an ordinary policy question through", () => {
    expect(detectEscalation("Refund policy", "Hi, what is your refund policy? I bought the React course last week.")).toBeNull();
    expect(detectEscalation("", "")).toBeNull();
  });

  it("flags legal threats", () => {
    expect(detectEscalation("Refund", "I will speak to my lawyer about this.")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("Last warning", "I'll sue you if this isn't fixed.")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("Last warning", "I’ll sue you")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("Notice", "This is a legal notice.")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("", "I am going to take this to consumer court")).toBe(EscalationCategory.LEGAL);
  });

  it("flags chargebacks and disputes, however they are spelled", () => {
    for (const text of ["I will file a chargeback", "I'll do a charge back", "CHARGE-BACK incoming", "charge   back", "I am disputing this charge", "I have disputed the payment"]) {
      expect(detectEscalation(text), text).toBe(EscalationCategory.CHARGEBACK_DISPUTE);
    }
  });

  it("flags security concerns", () => {
    for (const text of ["I think my account was hacked", "Someone logged in as me", "this looks like phishing", "I reported a security vulnerability", "unauthorised access to my account", "There was a data breach"]) {
      expect(detectEscalation(text), text).toBe(EscalationCategory.SECURITY);
    }
  });

  it("looks at every text it is given, subject included", () => {
    expect(detectEscalation("My account was hacked", "please help")).toBe(EscalationCategory.SECURITY);
    expect(detectEscalation("please help", "my account was hacked")).toBe(EscalationCategory.SECURITY);
  });

  it("ignores case, and treats curly quotes like straight ones", () => {
    expect(detectEscalation("LAWYER")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("Chargeback")).toBe(EscalationCategory.CHARGEBACK_DISPUTE);
  });

  it("matches whole words only, so ordinary words that contain a term are not flagged", () => {
    for (const text of ["I have an issue with the video", "thanks for your courtesy", "I joined the hackathon", "my name is Sue", "Regards, Sue", "the first firm answer", "disputable"]) {
      expect(detectEscalation(text), text).toBeNull();
    }
  });

  it("flags Hindi and Gujarati terms, including with an ending attached", () => {
    expect(detectEscalation("मैं वकील से बात करूँगा")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("मैं वकीलों से मिलूँगा")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("यह चार्जबैक का मामला है")).toBe(EscalationCategory.CHARGEBACK_DISPUTE);
    expect(detectEscalation("मेरा अकाउंट हैक हो गया")).toBe(EscalationCategory.SECURITY);
    expect(detectEscalation("હું વકીલ પાસે જઈશ")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("આ છેતરપિંડી છે")).toBe(EscalationCategory.SECURITY);
  });

  it("does not flag ordinary Hindi or Gujarati text", () => {
    expect(detectEscalation("मुझे रिफंड पॉलिसी बताइए")).toBeNull();
    expect(detectEscalation("મને કોર્સ વિશે માહિતી જોઈએ છે")).toBeNull();
  });

  it("answers the first category in the order legal, chargeback or dispute, security", () => {
    expect(detectEscalation("my lawyer says the account was hacked")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("I will dispute it, it looks like fraud")).toBe(EscalationCategory.CHARGEBACK_DISPUTE);
  });

  it("only reads the first 20,000 characters, so a huge text can't cost much", () => {
    const filler = "word ".repeat(5_000);
    expect(detectEscalation(`${filler}lawyer`)).toBeNull();
    expect(detectEscalation(`lawyer ${filler}`)).toBe(EscalationCategory.LEGAL);
    const start = performance.now();
    detectEscalation("a".repeat(1_000_000));
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe("ESCALATION_TERMS", () => {
  const entries = Object.entries(ESCALATION_TERMS) as [EscalationCategory, readonly string[]][];

  it("has every listed term matching, in its own category, inside a sentence", () => {
    for (const [category, terms] of entries) {
      for (const term of terms) {
        expect(detectEscalation(`Hello, ${term} today.`), term).toBe(category);
      }
    }
  });

  it("lists no term twice, so a term always has one category", () => {
    const all = entries.flatMap(([, terms]) => terms);
    expect(new Set(all).size).toBe(all.length);
  });

  it("covers the three required areas", () => {
    expect(Object.keys(ESCALATION_TERMS).sort()).toEqual(["CHARGEBACK_DISPUTE", "LEGAL", "SECURITY"]);
  });
});
