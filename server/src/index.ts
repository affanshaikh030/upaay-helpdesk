import { existsSync } from "node:fs";
import path from "node:path";
import * as Sentry from "@sentry/bun";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { inboundEmailRouter } from "./routes/inbound-email";
import { prisma } from "./db";
import { requireAuth } from "./middleware/auth";
import { startQueue, stopQueue } from "./queue";
import { knowledgeRouter } from "./routes/knowledge";
import { statsRouter } from "./routes/stats";
import { ticketsRouter } from "./routes/tickets";
import { meRouter, usersRouter } from "./routes/users";

const app = express();
const port = Number(process.env.PORT) || 3000;

// Behind a reverse proxy (Railway) every request arrives from the proxy. With one trusted hop Express reads the client
// address the proxy added (never a value the client supplied), so req.ip, and the rate limiters keyed on it, see real
// clients. Same switch as the Better Auth rate limit (auth.ts); leave it unset locally
if (process.env.TRUST_PROXY_HEADERS === "true") app.set("trust proxy", 1);

// Users are created by the seed script / admin only, so don't expose sign-up
app.all("/api/auth/sign-up/*splat", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Must be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

// Provider webhook: no session, guarded by INBOUND_EMAIL_SECRET and parses its own (larger) body.
// Mounted before the global express.json() so that limit doesn't apply
app.use("/api/inbound/email", inboundEmailRouter);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Everything below this point requires a session; add requireRole("ADMIN") per route as needed
app.use("/api", requireAuth);

app.use("/api/users", usersRouter);
app.use("/api/stats", statsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/knowledge", knowledgeRouter);

app.use("/api/me", meRouter);

// Production: serve the built client from the same origin as the API, so the browser needs no
// CORS and the session cookie stays first-party. In dev the Vite server does this instead
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(import.meta.dirname, "../../client/dist");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // Client-side routes (/tickets, /users, ...) all get index.html. An unknown /api path must
    // stay an API miss (not HTML), so it is passed on instead of served the page
    app.get("/*splat", (req, res, next) => {
      if (req.path === "/api" || req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    console.warn(`Client build not found at ${clientDist}: only the API is served`);
  }
}

// Must come after all routes. Bun can't auto-patch Express, so this middleware is what captures route errors
Sentry.setupExpressErrorHandler(app);

await startQueue();

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// Stop taking requests, let the active job finish, then close the queue and database pools
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close();
  server.closeIdleConnections();
  try {
    await stopQueue();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Shutdown failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
