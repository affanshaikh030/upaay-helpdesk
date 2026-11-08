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
- Client: `cd client && bun run dev` (Vite, default port 5173, falls back if taken); `bun run build`; `bun run lint`; `bun run test` (component tests, see below)
- The Vite dev server proxies `/api` to `http://localhost:3000`. Call the API with relative paths (`/api/...`), not absolute URLs.
- **Client data fetching:** use `axios` for HTTP requests (never `fetch`) and TanStack Query (`@tanstack/react-query`) for server state. Wrap each query in a hook under `client/src/hooks/` (see `use-users.ts`: `useQuery` with an exported query key, passing the `signal` from `queryFn` to axios) and use `useMutation` for writes, invalidating the related query key on success. Don't fetch in `useEffect` or keep server data in `useState`. The `QueryClient` is set up in `client/src/main.tsx` with retries off. Better Auth's `authClient` keeps making its own auth requests.

## Authentication
- **Library:** Better Auth (`better-auth`) with the Prisma adapter and database sessions (cookies). Server config: `server/src/auth.ts`, mounted at `/api/auth/*` in `server/src/index.ts` (before `express.json()`). Client: `authClient` in `client/src/lib/auth-client.ts` (`useSession`, `signIn.email`, `signOut`).
- **Email and password only; sign-up is disabled** (`disableSignUp: true`, and `/api/auth/sign-up/*` returns 404). Users are created by the seed script or an admin, never self-service.
- **Roles:** `user.role` is a server-owned additional field (`input: false`, default `AGENT`); the seeded admin gets `ADMIN`. Never accept `role` from client input.
- **Use the `Role` enum, never role string literals:** in server code import `Role` from `server/src/generated/prisma/enums` (`Role.ADMIN`, `Role.AGENT`), e.g. `requireRole(Role.ADMIN)` and `role: Role.AGENT`. The enum is the single source of truth (`prisma/schema.prisma`); don't write `"ADMIN"`/`"AGENT"` as plain strings.
- **First admin:** `cd server && bun run seed` reads `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (min 12 characters, no placeholders), `SEED_ADMIN_NAME` (optional). Idempotent: an existing ADMIN is a no-op; an existing non-admin with that email is only promoted if `SEED_PROMOTE_EXISTING=true`, otherwise the script exits with an error.
- **Env vars** (see `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET` (required, 32+ characters, not the `.env.example` placeholder; `auth.ts` throws at startup otherwise), `BETTER_AUTH_URL` (server origin), `TRUSTED_ORIGINS` (comma-separated browser origins, default `http://localhost:5173`; add the deployed client origin).
- **Protecting routes:** server: everything under `/api` after `/api/health` goes through `requireAuth` (`server/src/middleware/auth.ts`, 401 without a session, sets `res.locals.user`/`session`); add `requireRole("ADMIN")` per route for admin-only endpoints (403 otherwise). Never rely on client-side guards (`AdminRoute`) for authorization. Client: `Layout` redirects to `/login` without a session; `LoginPage` redirects to `/` with one.
- **Rate limiting:** enabled only when `NODE_ENV=production` (off in dev and tests) in `auth.ts`, with database storage (`rateLimit` table); `/sign-in/email` is limited to 5 per 60s per IP, others 100 per 60s. Behind a reverse proxy set `TRUST_PROXY_HEADERS=true` so real client IPs are used. `NODE_ENV=production` must be set in the deployment or there is no limiting at all.

## Component tests (Vitest + React Testing Library)
- **Run:** `cd client && bun run test` (single run, all tests) or `bun run test:watch` (re-runs on save while writing). One file: `cd client && bunx vitest run src/pages/UsersPage.test.tsx`. These are fast and need no server or database; they are separate from the Playwright E2E tests.
- **Where:** `<Component>.test.tsx` next to the component. Shared helpers are in `client/src/test/`: `setup.ts` (jest-dom matchers, cleanup, loaded by `vite.config.ts`) and `render.tsx` (`renderWithQuery`, wraps the component in a fresh `QueryClientProvider` with retries off). Add new shared helpers there; wrap routing in `MemoryRouter` inside the test when a component needs it.
- **Writing:** import `describe`, `it`, `expect`, `vi` from `vitest` (globals are off). Query like a user: `getByRole`, `getByLabelText`, `getByText`; use `findBy*` for async results and `queryBy*` to assert absence. Avoid `data-testid`, snapshots and testing implementation details. Mock the network with `vi.spyOn(axios, 'get')` (or `post`, etc.) and build errors with a real `AxiosError`; don't mock React Query itself. Restore mocks in `afterEach(() => vi.restoreAllMocks())`. Cover loading, success, empty and error states, plus role-dependent UI.
- **Executing:** run the relevant test file after writing or changing it and fix failures before reporting; show the results. Don't weaken a test to make it pass: report a real app bug instead.
- Same rule as E2E: write or run component tests only when I explicitly ask.

## E2E testing (Playwright)
- Config: `playwright.config.ts` (root); tests go in `e2e/tests/`. Run `bun run test:e2e` (or `test:e2e:ui`) from the repo root. Chromium only; install with `bunx playwright install chromium`.
- **Separate database:** `e2e/.env.test` (gitignored; copy from `e2e/.env.test.example`) points `DATABASE_URL` at `helpdesk_test`. Playwright starts its own API (port 3100) and client (port 5183) with that env, so it never touches the dev database and can run next to the dev servers.
- Before the API starts, `server/prisma/e2e-setup.ts` (`cd server && bun run test:db`) runs `prisma migrate deploy`, truncates all tables and creates the test admin and agent from `E2E_*` env vars (credentials in `e2e/env.ts` as `testUsers`). It refuses any database not named `*_test` on localhost.
- Auth rate limiting is off outside production, so tests can log in repeatedly.
- Don't use `prisma migrate reset` for the test DB: Prisma blocks it when run by an AI agent without user consent.
- **Writing tests:** use the `e2e-test-writer` subagent (`.claude/agents/e2e-test-writer.md`) for all new or extended E2E tests, instead of writing specs inline. Give it the page, flow or feature and the roles to cover (admin, agent). It writes specs in `e2e/tests/`, runs `bun run test:e2e` and reports results. It does not change app code, `playwright.config.ts`, the DB setup script or `.env` files: if a test needs such a change (for example a `data-testid`), it reports back and the main session makes the change, then re-invokes it.
- - Do NOT run E2E tests or add or update specs automatically. After code changes, run only typecheck and lint. Run E2E tests or use the e2e-test-writer subagent only when I explicitly ask.

## Documentation lookup (Context7)
Always use the Context7 MCP server to fetch current documentation before writing or changing code that uses a library, framework, SDK, or CLI tool (React, Vite, Express, Prisma, Tailwind, React Router, Zod, Bun, Anthropic SDK, etc.). Do this even for well-known libraries, since training data may be out of date.
1. `resolve-library-id` to find the library.
2. `query-docs` to get the relevant docs.

Skip it for general programming concepts or code that doesn't depend on a library API.

## Conventions
- The server uses TypeScript strict mode.
- **Express 5 async handlers:** don't wrap async route handlers or middleware in `try/catch` just to call `next(error)`. Express 5 forwards rejected promises to the error handler automatically. Only use `try/catch` when you need to do something on failure (e.g. clean up, as in the create-user handler).
- Follow `implementation-plan.md` phase by phase. Finish a phase, then stop for the user's approval before starting the next.
- Keep `tech-stack.md` and `project-scope.md` in sync if a technology or scope decision changes.
- Don't leave dev servers running in the background unless asked.
