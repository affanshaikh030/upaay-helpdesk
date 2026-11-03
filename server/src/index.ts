import express from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

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

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(session.user);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
