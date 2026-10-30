# Helpdesk (AI-Powered Ticket Management System)

Support tickets are created from emails, then classified, summarized and answered with AI. Agents manage them in a dashboard.

Source-of-truth docs (read these first):
- `project-scope.md`: problem, features, statuses, categories, roles
- `tech-stack.md`: chosen technologies
- `implementation-plan.md`: phased checklist; tick items off as they are done

## Stack
- **Runtime & package manager:** Bun. Use `bun install`, `bun add`, `bun run`. Do not use npm, yarn or pnpm.
- **Monorepo:** Bun workspaces: `client/` (React + Vite + TypeScript), `server/` (Express + TypeScript)
- **Auth:** database sessions (email and password), with a seed script that creates the first admin from environment variables
- **Planned:** Tailwind CSS, React Router, PostgreSQL + Prisma, Zod, Claude API (Anthropic SDK), SendGrid/Mailgun, Docker, Railway

## Commands
- Server: `cd server && bun run dev` (http://localhost:3000, health check at `/api/health`); `bun run typecheck`
- Client: `cd client && bun run dev` (Vite, default port 5173, falls back if taken); `bun run build`; `bun run lint`
- The Vite dev server proxies `/api` to `http://localhost:3000`. Call the API with relative paths (`/api/...`), not absolute URLs.

## Documentation lookup (Context7)
Always use the Context7 MCP server to fetch current documentation before writing or changing code that uses a library, framework, SDK, or CLI tool (React, Vite, Express, Prisma, Tailwind, React Router, Zod, Bun, Anthropic SDK, etc.). Do this even for well-known libraries, since training data may be out of date.
1. `resolve-library-id` to find the library.
2. `query-docs` to get the relevant docs.

Skip it for general programming concepts or code that doesn't depend on a library API.

## Conventions
- The server uses TypeScript strict mode.
- Follow `implementation-plan.md` phase by phase. Finish a phase, then stop for the user's approval before starting the next.
- Keep `tech-stack.md` and `project-scope.md` in sync if a technology or scope decision changes.
- Don't leave dev servers running in the background unless asked.
