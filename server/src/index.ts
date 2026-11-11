import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { inboundEmailRouter } from "./routes/inbound-email";
import { requireAuth } from "./middleware/auth";
import { ticketsRouter } from "./routes/tickets";
import { meRouter, usersRouter } from "./routes/users";

const app = express();
const port = Number(process.env.PORT) || 3000;

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
app.use("/api/tickets", ticketsRouter);

app.use("/api/me", meRouter);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
