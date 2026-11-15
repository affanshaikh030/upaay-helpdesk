import { prisma } from "../src/db";
import { Role, SenderType } from "../src/generated/prisma/enums";

// Dev-only demo data: a 20-reply conversation on ticket 106, alternating agent and customer (starting with
// the agent, since the customer's first message is the ticket body). Each reply is at least 5 lines.
// Idempotent: does nothing if the ticket already has replies.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo replies with NODE_ENV=production");
  process.exit(1);
}

const TICKET_ID = 106;

const messages = [
  `Hi Fatima,
Thanks for getting in touch, and sorry the FAQ didn't answer this.
Access to Python for Data Science is lifetime access for the current version of the course.
That means you can watch the lectures as often as you like with no expiry date.
Is there a particular reason you were wondering, such as a plan to buy it for later?
Kind regards,
Agent`,
  `Hi,
That's great news, thank you for the quick answer.
I'm planning to buy it now but I won't be able to start until the summer.
I just wanted to be sure I wouldn't lose access before I finish.
Does the lifetime access also cover any new lectures you add later?
Thanks,
Fatima`,
  `Hi Fatima,
Yes, any lectures we add to the course are included at no extra cost.
We usually refresh the course once or twice a year when the libraries change.
Updates appear automatically in your course list and you will get an email notification.
Only a completely new edition, such as a rebuild from scratch, would be sold separately.
That has not happened for this course so far.
Kind regards,
Agent`,
  `Thanks, that makes sense.
One more thing: can I download the videos to watch offline?
I travel a lot for work and the connection on trains is quite unreliable.
If downloads are not possible, is there a mobile app that would cache them?
I'd rather know before I pay.
Fatima`,
  `Hi Fatima,
Good question. Downloads are available in our iOS and Android apps.
You can save individual lectures or whole sections to your device.
Downloads stay available while you are signed in and the course is on your account.
They are not available in the web browser, only in the apps.
The apps are free to install from the App Store and Google Play.
Agent`,
  `Perfect, the app is exactly what I need.
I also need a certificate of completion for my employer.
They reimburse training costs, but only if I can show proof that I finished the course.
Do you issue a certificate, and does it include my name and the date?
Will it still be available if I finish months after buying?
Fatima`,
  `Hi Fatima,
Yes, a certificate of completion is issued once you finish all the required lectures and quizzes.
It shows your name, the course title and the completion date.
You can download it as a PDF from the course page at any time afterwards.
It doesn't matter how long after the purchase you finish, there is no deadline.
If your employer needs a specific format, tell us and we will see what we can do.
Agent`,
  `That's helpful, thank you.
My employer will also want an invoice that shows the company name and VAT number.
I would be paying with my personal card first and claiming it back later.
Can the invoice be issued in the company's name even though I'm the one buying?
And can I change the details after the purchase if I forget something?
Fatima`,
  `Hi Fatima,
Yes, you can add a company name and VAT number at checkout under billing details.
The invoice will be issued to that company even if you pay with a personal card.
If you forget something, reply to your order confirmation email and we will reissue the invoice.
Please do that within 30 days so it is still in the same accounting period.
Reissued invoices keep the original order number.
Agent`,
  `Great, that solves the reimbursement problem.
Now a slightly different question about the course itself.
I've only used Python for basic scripting, never for data analysis.
Is the course suitable for someone at my level, or should I do an introductory course first?
I don't want to buy something that moves too fast for me.
Fatima`,
  `Hi Fatima,
The course starts with a short refresher on Python basics before it moves to data analysis.
It assumes you can write simple scripts, which sounds like where you are.
The first two sections cover NumPy and pandas step by step with exercises.
Most learners with basic scripting experience find the pace comfortable.
If you do get stuck, the Q&A section under each lecture is monitored by the instructors.
Agent`,
  `That sounds just right for me.
Are the exercises something I do in the browser, or do I need to install Python locally?
My work laptop is locked down, so I may not be allowed to install software on it.
I could use my personal laptop, but I would rather do it all in one place.
A browser-based option would make things much easier.
Fatima`,
  `Hi Fatima,
Both options work. Each exercise has a built-in coding environment that runs in your browser.
Nothing needs to be installed, and your progress is saved to your account.
The larger projects in the later sections do ask you to use Jupyter notebooks.
You can run those on the free hosted notebooks we link to, so a local install isn't required.
That should work fine on a locked-down laptop.
Agent`,
  `Brilliant, that was my last big worry.
A colleague mentioned there is a discount if several people from the same team buy the course.
Three of us are interested, and we would all use the same company invoice.
Is there a team price, and would we each get our own access or share one login?
I would hate to be told afterwards that sharing logins is not allowed.
Fatima`,
  `Hi Fatima,
We do offer team pricing for three or more seats, and it is cheaper per person.
Each person gets their own account and their own progress, because sharing a login is not allowed.
The team admin buys the seats and then invites colleagues by email.
You would also get a single invoice for all the seats in the company's name.
I can send you a quote if you tell me how many seats you need.
Agent`,
  `Yes please, three seats would be perfect.
Could the quote include the VAT breakdown and the price per seat?
My manager has to approve the budget before we can go ahead.
He usually wants the numbers in writing so he can attach them to the request.
Do you have an idea how long the quote stays valid?
Fatima`,
  `Hi Fatima,
I've prepared the quote for three seats and attached it to this ticket's email thread.
It lists the price per seat, the total, and the VAT shown as a separate line.
The quote is valid for 30 days from today, so your manager has time to approve it.
If the price changes in that time, we will honour the quoted one.
Let me know if he needs anything else for the approval.
Agent`,
  `I have the quote, thank you, it looks clear.
My manager approved it this morning, so we are ready to go ahead.
How do we pay: can we do a bank transfer against the invoice instead of using a card?
Our finance department doesn't allow card payments for training.
If a transfer is possible, how quickly would the seats become active?
Fatima`,
  `Hi Fatima,
Yes, we accept bank transfer for team orders, and I will issue a proforma invoice with our bank details.
Please include the invoice number as the payment reference so we can match it.
Seats are activated as soon as the payment arrives, which is normally one to two working days.
You will receive an email when they are live, and the admin can then invite the team.
If the transfer is delayed, just let me know and I can check on our side.
Agent`,
  `Understood, finance will start the transfer today.
Thank you so much for being so patient with all my questions.
Honestly this was the most helpful support experience I have had with an online course platform.
I'll write back if the payment doesn't show up after two working days.
Have a great week.
Fatima`,
];

const ticket = await prisma.ticket.findUnique({ where: { id: TICKET_ID }, select: { id: true, createdAt: true, _count: { select: { replies: true } } } });
if (!ticket) {
  console.error(`Ticket ${TICKET_ID} not found`);
  process.exit(1);
}
if (ticket._count.replies > 0) {
  console.log(`Ticket ${TICKET_ID} already has ${ticket._count.replies} replies, nothing to do`);
  process.exit(0);
}

const agent = await prisma.user.findFirst({ where: { role: Role.AGENT, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
if (!agent) {
  console.error("No active agent found to author the replies; create one first");
  process.exit(1);
}

// Spread over several days, starting 30 minutes after the ticket, so the thread has realistic timestamps
const hour = 60 * 60 * 1000;
await prisma.reply.createMany({
  data: messages.map((body, i) => ({
    ticketId: TICKET_ID,
    body,
    senderType: i % 2 === 0 ? SenderType.AGENT : SenderType.CUSTOMER,
    authorId: i % 2 === 0 ? agent.id : null,
    createdAt: new Date(ticket.createdAt.getTime() + hour / 2 + i * 7 * hour),
  })),
});

console.log(`Added ${messages.length} replies to ticket ${TICKET_ID}`);
await prisma.$disconnect();
