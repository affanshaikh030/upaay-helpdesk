import { timingSafeEqual } from "node:crypto";
import express, { Router, type NextFunction, type Request, type Response } from "express";
import { inboundEmailSchema } from "@helpdesk/core";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../db";

const SECRET_PLACEHOLDER = "generate-with-openssl-rand-base64-32";

// Unset (or empty) disables the endpoint. A weak or placeholder value fails at startup, like BETTER_AUTH_SECRET
function readSecret() {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) return undefined;
  if (secret === SECRET_PLACEHOLDER || secret.length < 32) {
    throw new Error(
      "INBOUND_EMAIL_SECRET must be a random value of at least 32 characters (openssl rand -base64 32), or unset to disable inbound email",
    );
  }
  return Buffer.from(secret);
}

const secret = readSecret();

function requireInboundSecret(req: Request, res: Response, next: NextFunction) {
  if (!secret) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const provided = Buffer.from(req.header("x-inbound-secret") ?? "");
  if (provided.length !== secret.length || !timingSafeEqual(provided, secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export const inboundEmailRouter = Router();

// Called by the email provider, so it has no session: guarded by a shared secret instead.
// Checked before the body is parsed so unauthenticated callers can't make us buffer 1mb
inboundEmailRouter.post("/", requireInboundSecret, express.json({ limit: "1mb" }), async (req, res) => {
  const parsed = inboundEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors });
    return;
  }
  const { from, fromName, subject, text, messageId } = parsed.data;

  try {
    const ticket = await prisma.ticket.create({
      data: {
        subject: subject || "(no subject)",
        body: text,
        fromEmail: from,
        fromName,
        messageId,
      },
      select: { id: true },
    });
    res.status(201).json({ id: ticket.id });
  } catch (err) {
    // Provider retry of an email we already stored: answer with the existing ticket
    if (messageId && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.ticket.findUniqueOrThrow({ where: { messageId }, select: { id: true } });
      res.status(200).json({ id: existing.id });
      return;
    }
    throw err;
  }
});
