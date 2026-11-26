# Upaay

**Every query, a solution.**

An AI-powered helpdesk and ticket management system. Support emails become tickets, AI tags and summarises them, suggests replies from a knowledge base, and can decide when a ticket is safe to auto-resolve and when it must go to a human.

**Live demo:** https://server-production-5f181a11.up.railway.app
**Demo login (agent):** agent1@example.com / example@1234

Built along with the "Claude Code for Professional Developers" course by Code with Mosh, then extended with my own features.

## Features

**From the course**
- Email-to-ticket through a secured inbound webhook
- Admin and agent roles with Better Auth
- Ticket list with search, filters, sorting and pagination
- Ticket detail page with replies and assignment
- User management for admins
- Background jobs with pg-boss
- Unit, component and end-to-end tests; Docker deployment on Railway

**Added by me**
- Dashboard: total and open tickets, AI-resolved share, average resolution time, tickets per day
- AI tagging: category, priority and sentiment
- AI suggested replies, reply polishing and one-click summaries
- FAQs (knowledge base) with full-text search
- AI auto-resolve with safety gates: urgent, negative, refund and unclear tickets always go to a human; answers must cite FAQ articles; a final check blocks unsupported contact details or money promises
- Shadow mode: the AI records what it would have done without replying, so its decisions can be reviewed first
- Hindi and Gujarati interface labels, dark mode and custom branding
- Security hardening: HTML sanitising, rate limiting, secret rotation and stronger passwords

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind v4, shadcn/ui, TanStack Query
- **Backend:** Bun, Express 5, Prisma 7, PostgreSQL, Better Auth, pg-boss
- **AI:** Google Gemini via the Vercel AI SDK
- **Testing and deploy:** Vitest, Playwright, Docker, Railway

## Project structure

- `client/` React app
- `server/` Express API and background jobs
- `core/` shared validation and types (`@helpdesk/core`)
- `e2e/` Playwright tests

## Notes

- Replies are stored in the app only; outgoing email is not connected yet.
- AI auto-resolve runs in shadow mode by default.
- Planned: outgoing email after reviewing shadow-mode results, and Hindi and Gujarati FAQs.

## Running locally

Requires Bun and PostgreSQL. Copy each `.env.example` file to `.env`, fill in the values, then run `bun install` and start the client and server from their folders. See `CLAUDE.md` for the exact commands.
