# Tech Stack

- **Runtime & package manager:** Bun (workspaces monorepo, `bun install`, `bun run`)
- **Frontend:** React + TypeScript (Vite), Tailwind CSS, React Router
- **Backend:** Bun + Express + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Database sessions (email and password), with a seed script that creates the first admin from environment variables
- **AI:** Claude API (Anthropic SDK) for ticket classification, summaries, and suggested replies
- **Email:** SendGrid or Mailgun (inbound via webhook, outbound for replies)
- **Deployment:** Docker, hosted on Railway
- **Tooling:** Docker for local Postgres, Zod for request validation
- **KB retrieval:** Skipped for now
