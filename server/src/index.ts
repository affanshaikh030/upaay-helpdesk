import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { requireAuth } from "./middleware/auth";
import { meRouter, usersRouter } from "./routes/users";

const app = express();
const port = Number(process.env.PORT) || 3000;

// Users are created by the seed script / admin only, so don't expose sign-up
app.all("/api/auth/sign-up/*splat", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Must be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Everything below this point requires a session; add requireRole("ADMIN") per route as needed
app.use("/api", requireAuth);

app.use("/api/users", usersRouter);

app.use("/api/me", meRouter);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
