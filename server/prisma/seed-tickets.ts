import { prisma } from "../src/db";
import { TicketCategory, TicketStatus } from "../src/generated/prisma/enums";

// Dev-only demo data: 100 varied tickets for trying out sorting and filtering.
// Idempotent: each ticket has a fixed messageId, so re-running adds nothing.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo tickets with NODE_ENV=production");
  process.exit(1);
}

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];

const people = [
  "Priya Sharma", "Marcus Johnson", "Elena Rossi", "Tom Becker", "Aisha Khan", "Liam O'Connor",
  "Sofia Martinez", "Daniel Kim", "Hannah Müller", "Carlos Mendes", "Olivia Brown", "Yuki Tanaka",
  "Noah Williams", "Fatima Al-Sayed", "Ben Carter", "Chloe Dubois", "Ravi Patel", "Emma Larsson",
  "Jack Thompson", "Mei Lin Chen", "Lucas Silva", "Grace Adeyemi", "Oscar Novak", "Zoe Campbell",
];
const courses = [
  "Advanced React", "Python for Data Science", "Node.js Masterclass", "TypeScript Deep Dive",
  "UX Design Fundamentals", "AWS Certified Cloud Practitioner", "SQL for Beginners", "Docker & Kubernetes Bootcamp",
];
const domains = ["gmail.com", "outlook.com", "yahoo.com", "proton.me", "icloud.com", "hotmail.com", "company.io"];

type Template = { subject: string; body: string };

const refund: Template[] = [
  { subject: "Refund request for {course}", body: "Hi, I bought {course} three days ago but it isn't what I expected. I haven't watched more than the first two lectures. Could you please refund me?" },
  { subject: "Charged twice for {course}", body: "I was billed twice for {course} on the same day (two identical charges on my card). Please refund the duplicate payment." },
  { subject: "Cancel subscription and refund last month", body: "I forgot to cancel my annual plan before it renewed yesterday. I haven't used the platform at all since last year. Can I get a refund?" },
  { subject: "Money-back guarantee", body: "Your site says there's a 30-day money-back guarantee. I'd like to use it for {course}. Order placed 12 days ago." },
  { subject: "Refund still not received", body: "You approved my refund two weeks ago but nothing has arrived in my account. My bank says no refund has been initiated. Can you check?" },
  { subject: "Wrong course purchased", body: "I accidentally bought {course} instead of the beginner version. I'd like a refund so I can buy the right one." },
  { subject: "Course content was outdated", body: "Large parts of {course} use library versions from years ago and the examples no longer run. I'd like my money back." },
  { subject: "Unauthorized charge on my card", body: "There's a charge from your company on my statement that I don't recognise. I never signed up. Please refund it and close any account tied to this email." },
  { subject: "Refund for team licence", body: "We bought 5 seats for {course} but only 2 of our people ever needed it. Can we get a partial refund for the unused seats?" },
  { subject: "Duplicate order, please refund one", body: "My payment page froze and I clicked pay again. Now I own {course} twice. Please refund one order." },
];

const technical: Template[] = [
  { subject: "Video won't play in {course}", body: "Lesson 4 of {course} just shows a black screen with a spinner. I've tried Chrome and Firefox. Other lessons play fine." },
  { subject: "Can't log in after password reset", body: "I reset my password and the email said it worked, but I still get 'invalid credentials' when I sign in. Using the same address as always." },
  { subject: "Certificate not generated", body: "I finished 100% of {course} yesterday but the certificate button is greyed out. Do I need to do anything else?" },
  { subject: "Download links return 404", body: "The project files for section 3 of {course} give a 404 error. I need them to follow the exercises." },
  { subject: "Subtitles out of sync", body: "The English subtitles in {course} are about 5 seconds ahead of the audio from lecture 12 onwards. Makes it hard to follow." },
  { subject: "Progress not saving", body: "Every time I come back to {course} it starts me at lesson 1 even though I've completed 20 lessons. I'm on the mobile app." },
  { subject: "App crashes on startup (Android)", body: "Since the latest update the Android app closes immediately after the splash screen. Pixel 7, Android 15." },
  { subject: "Quiz submit button does nothing", body: "I answered every question in the final quiz but pressing Submit doesn't do anything and there's no error message. Tried twice." },
  { subject: "Two-factor code never arrives", body: "I enabled SMS two-factor authentication and now I can't sign in because the code never arrives. My number is correct in my profile." },
  { subject: "Code editor is stuck loading", body: "The in-browser coding exercise in {course} has been 'Loading environment...' for over 10 minutes. Refreshing didn't help." },
  { subject: "Audio only plays in one ear", body: "In several lectures of {course} the audio is only coming out of my left headphone. Other sites are fine." },
  { subject: "Can't update billing address", body: "I get a generic 'Something went wrong' toast when saving a new billing address. I need it changed for an invoice." },
];

const general: Template[] = [
  { subject: "Do you offer student discounts?", body: "Hello, I'm a university student and wondering whether you have any discount for students on {course}?" },
  { subject: "How long do I have access to a course?", body: "Is access to {course} lifetime, or does it expire after a year? I couldn't find it on the FAQ." },
  { subject: "Invoice for company expenses", body: "I need a VAT invoice with our company name and tax number for my purchase of {course}. Where can I download it?" },
  { subject: "Is {course} suitable for beginners?", body: "I have no prior experience. Do I need any prerequisites before starting {course}?" },
  { subject: "Request: course on Rust", body: "Love the platform! Any plans to add a Rust course? A lot of us would be interested." },
  { subject: "Change the email on my account", body: "I changed jobs and no longer have access to my old email. How can I move my account to a new address?" },
  { subject: "Corporate training enquiry", body: "We're a company of 80 developers and would like training for the team. Do you offer group pricing or an enterprise plan?" },
  { subject: "Can I download lectures for offline viewing?", body: "I commute without internet. Is there a way to download {course} videos to watch on the train?" },
  { subject: "Partnership / affiliate program", body: "I run a developer newsletter with ~15k subscribers. Do you have an affiliate program we could join?" },
  { subject: "Feedback on {course}", body: "Just wanted to say the instructor is fantastic. One suggestion: add a short recap at the end of each section." },
];

// Vague emails the AI hasn't classified yet (or can't)
const uncategorized: Template[] = [
  { subject: "", body: "Hi" },
  { subject: "Question", body: "Hello, I have a question about my account but I'm not sure who to ask. Can someone get back to me?" },
  { subject: "Re: your last email", body: "Thanks, but that doesn't solve it. Please call me." },
  { subject: "Urgent!!!", body: "Need help ASAP, please reply as soon as you see this." },
  { subject: "Fwd: Order confirmation", body: "Forwarding this, can you look into it? See below. -- Sent from my iPhone" },
];

// [category, templates, how many, open/resolved/closed percentages]
const plan: [TicketCategory | null, Template[], number, [number, number, number]][] = [
  [TicketCategory.REFUND_REQUEST, refund, 30, [35, 35, 30]],
  [TicketCategory.TECHNICAL_QUESTION, technical, 36, [40, 40, 20]],
  [TicketCategory.GENERAL_QUESTION, general, 24, [30, 40, 30]],
  [null, uncategorized, 10, [100, 0, 0]],
];

const pickStatus = ([open, resolved]: [number, number, number]) => {
  const r = rand() * 100;
  return r < open ? TicketStatus.OPEN : r < open + resolved ? TicketStatus.RESOLVED : TicketStatus.CLOSED;
};

const fill = (text: string, course: string) => text.replaceAll("{course}", course);
const DAY = 86_400_000;
const now = Date.now();

const rows = plan.flatMap(([category, templates, count, weights]) =>
  Array.from({ length: count }, (_, i) => {
    const template = templates[i % templates.length];
    const course = pick(courses);
    const fromName = pick(people);
    const local = fromName.normalize("NFD").replace(/[^\w\s]/g, "").toLowerCase().replace(/\s+/g, ".");
    // Open tickets skew recent; older ones are mostly resolved or closed
    const status = pickStatus(weights);
    const ageDays = status === TicketStatus.OPEN ? rand() * 14 : rand() * 75;
    return {
      subject: fill(template.subject, course),
      body: fill(template.body, course),
      fromName,
      fromEmail: `${local}${Math.floor(rand() * 90) + 10}@${pick(domains)}`,
      status,
      category,
      createdAt: new Date(now - ageDays * DAY),
    };
  }),
);

// Oldest first so ids ascend with time, like real inbound mail
rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

const result = await prisma.ticket.createMany({
  data: rows.map((row, i) => ({ ...row, messageId: `<demo-ticket-${i + 1}@seed.helpdesk.example>` })),
  skipDuplicates: true,
});
console.log(`Created ${result.count} demo tickets (${rows.length - result.count} already existed)`);
await prisma.$disconnect();
