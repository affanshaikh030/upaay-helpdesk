# Implementation Plan

## Phase 1: Project Setup

- [x] Initialize monorepo structure (`/client`, `/server`)
- [x] Set up Express server with TypeScript
- [x] Set up React app with TypeScript
- [ ] Set up PostgreSQL database

## Phase 2: Authentication

- [x] Create login page
- [x] Implement login API endpoint
- [x] Implement session-based authentication middleware
- [x] Implement logout API endpoint
- [ ] Add route protection on the frontend (redirect to login if unauthenticated)

## Phase 3: User Management

- [ ] Create user management page (admin only)
- [ ] Implement create agent API endpoint
- [x] Implement list users API endpoint
- [ ] Implement edit user API endpoint
- [ ] Implement delete user API endpoint
- [ ] Add role-based access control (admin vs agent)

## Phase 4: Ticket CRUD

- [ ] Implement create ticket API endpoint
- [ ] Implement list tickets API endpoint (with filtering by status and category, sorting) — list sorted newest first is done; filtering is not
- [ ] Implement get ticket API endpoint
- [ ] Implement update ticket API endpoint (change status, assign agent)
- [ ] Create ticket list page with filtering and sorting — list page (newest first) is done; filtering is not
- [ ] Create ticket detail page

## Phase 5: AI Features

- [ ] Set up Claude API integration
- [x] Implement auto-classification endpoint (categorize incoming tickets)
- [ ] Implement AI summary endpoint (generate ticket summary)
- [ ] Implement AI suggested reply endpoint
- [x] Build knowledge base structure and seed with initial content (first version: `server/knowledge-base.md`, now replaced by database articles, see Phase B below)
- [ ] Integrate AI features into ticket detail page UI

### Phase B: Knowledge base and safer AI auto-resolve

- [x] AI sentiment and priority tagging on the classify job, list filters and sorting, agent override, admin re-analyse (Phase A)
- [x] `KnowledgeArticle` model with a Postgres generated `tsvector` column, `Reply.sourceArticleId` and the `AutoResolveAttempt` audit table (additive migration)
- [x] Admin knowledge base API (`/api/knowledge`: list, create, edit, delete) and the admin `/knowledge` page with a navbar link, in en, hi and gu
- [x] Postgres full-text retrieval (`ts_rank_cd`, top 5, minimum rank `MIN_RETRIEVAL_RANK`, sanitised query builder), no pgvector and no new service
- [x] Chain auto-resolve after the classify job, so priority and sentiment exist first
- [x] Safety gates before an AI reply: not classified, URGENT, NEGATIVE, REFUND_REQUEST, escalation wording (legal, chargeback or dispute, security), no relevant article, model must cite supplied articles, confidence >= 0.8
- [x] Shadow mode by default (`AUTO_RESOLVE_SHADOW_MODE`; only `false` turns it off) recording each decision in `AutoResolveAttempt`, with the shadow results table on the Knowledge page
- [x] "AI-resolved" filter on the ticket list (hidden by default) and "Based on: <article title>" under AI replies
- [x] Stop reading `server/knowledge-base.md`, delete it, and use "Upaay" in the prompt
- [ ] Apply the migration to the deployed database (back up first) and deploy
- [ ] Enter the real articles on the Knowledge page (the knowledge base starts empty)
- [ ] Review the shadow results, tune `MIN_RETRIEVAL_RANK` from the recorded `topRank`, then set `AUTO_RESOLVE_SHADOW_MODE=false`
- [ ] Native-speaker review of the Hindi and Gujarati strings and escalation terms
- [ ] Retrieval for Hindi and Gujarati tickets (the English-stemmed search can't match an English article from them)

## Phase 6: Email Integration

- [ ] Set up email provider (SendGrid/Mailgun)
- [x] Implement inbound email webhook to create tickets (provider-neutral JSON, secret-guarded; uses a minimal `Ticket` model, full ticket CRUD is still Phase 4)
- [ ] Implement outbound email sending when an agent replies
- [ ] Handle email threading (replies linked to existing tickets)

## Phase 7: Dashboard

- [x] Create dashboard page with ticket overview stats (total, open, resolved by AI, % by AI, average resolution time)
- [ ] Add tickets by category breakdown
- [ ] Add recent tickets list
- [ ] Add quick filters to navigate to filtered ticket list

## Phase 8: Polish & Deployment

- [ ] Add input validation and error handling across all endpoints
- [ ] Add loading states and error states on the frontend
- [x] Write Dockerfile for server and client (one image: the API serves the built client, see CLAUDE.md "Deployment")
- [ ] Set up Docker Compose for local development
- [x] Write deployment configuration (`railway.json`; first deploy and staging checks still to do)