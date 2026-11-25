import type { Request, RequestHandler, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

// In-memory counters: per process, and reset by a restart. That is right for the single replica this app runs as; with
// more replicas each one would count on its own and the real limit would be higher
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type Key = (req: Request, res: Response) => string;

export function createLimiter(options: { limit: number; windowMs: number; key: Key }): RequestHandler {
  return rateLimit({
    limit: options.limit,
    windowMs: options.windowMs,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again shortly" },
    keyGenerator: options.key,
  });
}

// The client address as Express sees it. Behind a proxy that needs `trust proxy` (see index.ts), otherwise every request
// looks like it comes from the proxy and shares one counter. IPv6 addresses are grouped by their /56 so one host can't
// get a fresh counter per address
const byIp: Key = (req) => ipKeyGenerator(req.ip ?? "unknown");

// The signed-in user, so people behind one office address don't share a counter. Only used after requireAuth
const byUser: Key = (_req, res) => String(res.locals.user?.id ?? "anonymous");

// The routes that call Gemini (polish, summarise, re-analyse), one shared counter per user. Each call takes seconds and
// costs quota, and a person can't realistically click more than a few a minute: 20 a minute and 200 an hour leave a
// demo or a busy agent far from the limit, and stop a stuck loop or a hijacked account
export const aiRateLimit: RequestHandler[] = [
  createLimiter({ limit: 20, windowMs: MINUTE, key: byUser }),
  createLimiter({ limit: 200, windowMs: HOUR, key: byUser }),
];

// The email webhook, 120 a minute per address (2 a second). A provider posts from a few addresses and a burst of 100
// emails a minute is normal; one that goes over gets a 429 and retries. It runs before the secret check, so guessing the
// secret is slowed down too
export const inboundEmailRateLimit = createLimiter({ limit: 120, windowMs: MINUTE, key: byIp });
