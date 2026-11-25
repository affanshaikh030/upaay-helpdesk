import { describe, expect, it } from "vitest";
import { checkDraftReply, detectEscalation, ESCALATION_TERMS, EscalationCategory, ReplyProblem } from "./escalation";

describe("detectEscalation", () => {
  it("lets an ordinary policy question through", () => {
    expect(detectEscalation("Certificates", "Hi, does the React course give a certificate? I bought it last week.")).toBeNull();
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
    expect(detectEscalation("मुझे कोर्स का सर्टिफिकेट चाहिए")).toBeNull();
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

  it("covers the four required areas", () => {
    expect(Object.keys(ESCALATION_TERMS).sort()).toEqual(["CHARGEBACK_DISPUTE", "LEGAL", "REFUND", "SECURITY"]);
  });
});

describe("detectEscalation: refunds and money back", () => {
  it("flags English refund wording, in every inflection, even for a plain policy question", () => {
    for (const text of [
      "I want a refund", "Refunds please", "I was refunded twice", "what is your refund policy?", "Give me my MONEY BACK",
      "money-back guarantee?", "please reimburse me", "I need reimbursement", "give back my money", "I want to cancel and refund",
    ]) {
      expect(detectEscalation(text), text).toBe(EscalationCategory.REFUND);
    }
  });

  it("flags Hinglish spellings", () => {
    for (const text of [
      "mujhe paisa wapas chahiye", "Paise wapas karo", "paisa vapas do", "mujhe refund chahiye", "refund kar do please",
      "Refund CHAHIYE", "mere paise lautao", "rupaye wapas", "amount wapas chahiye",
    ]) {
      expect(detectEscalation(text), text).toBe(EscalationCategory.REFUND);
    }
  });

  it("flags Hindi and Gujarati, including with an ending attached", () => {
    for (const text of [
      "मुझे रिफंड चाहिए", "मेरा रिफ़ंड कब मिलेगा", "मुझे मेरे पैसे वापस चाहिए", "रिफंडों के बारे में पूछना है", "મારે રિફંડ જોઈએ છે",
      "મારા પૈસા પાછા આપો", "રકમ પરત કરો",
    ]) {
      expect(detectEscalation(text), text).toBe(EscalationCategory.REFUND);
    }
  });

  it("flags the extra chargeback spellings as a chargeback", () => {
    for (const text of ["I will ask for a reversal", "payment reversal please", "चार्ज बैक करूँगा", "ચાર્જ બેક કરીશ", "main chargeback karunga"]) {
      expect(detectEscalation(text), text).toBe(EscalationCategory.CHARGEBACK_DISPUTE);
    }
  });

  it("does not flag words that only contain a term, or ordinary text about money", () => {
    // "repayments" is not a listed inflection, and terms match whole words only
    for (const text of ["the course price is 500 rupees", "I paid by card", "my moneybox", "repayments", "how do I get a certificate"]) {
      expect(detectEscalation(text), text).toBeNull();
    }
  });

  it("lets a legal or security hit win over a refund mention, as the earlier categories come first", () => {
    expect(detectEscalation("I want a refund or I will call my lawyer")).toBe(EscalationCategory.LEGAL);
    expect(detectEscalation("refund my hacked account")).toBe(EscalationCategory.SECURITY);
  });
});

describe("checkDraftReply", () => {
  const certificate = "Certificates\nA certificate is issued upon course completion. Download it from your profile.";
  const withLinks =
    "Help centre\nVisit https://www.upaay.com/help for guides, or write to support@upaay.com. Refunds are explained at upaay.com/refunds.";
  const good = "Hi Jane, yes, you get a certificate when you finish the course. You can download it from your profile.";

  it("passes a normal reply that stays within the articles", () => {
    expect(checkDraftReply(good, [certificate])).toBeNull();
  });

  it("passes an empty reply and an empty article list, so only real problems block", () => {
    expect(checkDraftReply("", [])).toBeNull();
    expect(checkDraftReply("Hello Jane, thanks for asking.", [])).toBeNull();
  });

  describe("links", () => {
    it.each([
      ["https URL", "Please log in at https://evil.example/claim to get it."],
      ["www address", "Go to www.evil.example/claim now."],
      ["bare domain with a path", "Visit evil.example/claim."],
      ["bare domain", "Open evil.example today"],
      ["page on a known site", "See https://upaay.com/other-page"],
    ])("blocks an invented %s", (_name, text) => {
      expect(checkDraftReply(`Hi Jane. ${text}`, [withLinks])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
    });

    it("blocks a link when the articles have none", () => {
      expect(checkDraftReply("See https://upaay.com/help", [certificate])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
    });

    it("passes a link the articles contain, however it is written", () => {
      for (const text of [
        "See https://www.upaay.com/help for guides.", "See upaay.com/help for guides.", "See https://upaay.com/help.",
        "See (www.upaay.com/help), thanks", "See HTTPS://UPAAY.COM/HELP/", "See https://upaay.com", "See upaay.com/refunds",
      ]) {
        // The refund word is in the article too, so it is only the link that is checked here
        expect(checkDraftReply(`Hi Jane. ${text}`, [withLinks]), text).toBeNull();
      }
    });

    it("does not let a look-alike or longer address pass because the articles contain part of it", () => {
      expect(checkDraftReply("See evil.com", ["Our partner is devil.com"])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
      expect(checkDraftReply("See site.com/a/b", ["See site.com/a"])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
      expect(checkDraftReply("See site.com/a", ["See site.com/ab"])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
      expect(checkDraftReply("See site.com/a", ["See site.com/a/b"])).toBeNull();
    });

    it("treats a file name like a link, since it can't tell them apart", () => {
      expect(checkDraftReply("Download certificate.pdf from your profile", [certificate])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
    });

    it("does not read abbreviations, decimals or sentence ends as links", () => {
      expect(checkDraftReply("Yes, e.g. the certificate, i.e. the PDF. It takes 3.5 hours. Thanks.", [certificate])).toBeNull();
    });
  });

  describe("email addresses", () => {
    it("blocks an invented address, and one that only extends a real one", () => {
      expect(checkDraftReply("Write to refunds@evil.example please", [withLinks])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
      expect(checkDraftReply("Write to support@upaay.com.au please", [withLinks])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
    });

    it("passes an address the articles contain, in any case and with a full stop after it", () => {
      expect(checkDraftReply("Write to Support@Upaay.com.", [withLinks])).toBeNull();
    });

    it("does not also read the domain of an allowed address as a separate link", () => {
      expect(checkDraftReply("Write to support@upaay.com", ["Contact: support@upaay.com"])).toBeNull();
    });
  });

  describe("money commitments", () => {
    it.each([
      "We will refund you in 3 days.", "You will be reimbursed in full.", "We have refunded the amount.",
      "You will get a credit on your account.", "We will give you compensation.", "We'll give you your money back.",
      "We will waive the fee.", "It is free of charge for you.", "There is no extra cost.", "We have credited your account.",
    ])("blocks %s when the articles never mention it", (text) => {
      expect(checkDraftReply(`Hi Jane. ${text}`, [certificate])).toBe(ReplyProblem.MONEY_COMMITMENT);
    });

    it("blocks Hindi and Gujarati money promises", () => {
      for (const text of [
        "हम आपको रिफंड देंगे", "आपके पैसे वापस मिलेंगे", "हम मुआवज़ा देंगे", "फीस माफ कर दी जाएगी", "અમે રિફંડ આપીશું",
        "તમારા પૈસા પાછા મળશે", "અમે વળતર આપીશું",
      ]) {
        expect(checkDraftReply(text, [certificate]), text).toBe(ReplyProblem.MONEY_COMMITMENT);
      }
    });

    it("lets the reply use a money word that a cited article uses too", () => {
      const policy = "Refund policy\nRefunds are available within 30 days of purchase.";
      expect(checkDraftReply("Refunds are available within 30 days of purchase.", [policy])).toBeNull();
    });

    it("only counts the cited articles: a word in some other article doesn't help", () => {
      expect(checkDraftReply("We will refund you.", [certificate])).toBe(ReplyProblem.MONEY_COMMITMENT);
    });

    it("does not read an apology as a commitment", () => {
      for (const text of ["I'm sorry for the trouble.", "माफ़ कीजिए, देर हुई।", "માફ કરશો, મોડું થયું."]) {
        expect(checkDraftReply(text, [certificate]), text).toBeNull();
      }
    });
  });

  it("checks links before money wording, and stays fast on a huge reply", () => {
    expect(checkDraftReply("We will refund you at evil.example", [certificate])).toBe(ReplyProblem.UNSUPPORTED_CONTACT);
    const start = performance.now();
    checkDraftReply("a".repeat(1_000_000), [certificate]);
    checkDraftReply("a.".repeat(500_000), [certificate]);
    expect(performance.now() - start).toBeLessThan(1_000);
  });
});
