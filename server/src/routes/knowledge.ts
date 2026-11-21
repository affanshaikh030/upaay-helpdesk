import { Router } from "express";
import { createKnowledgeArticleSchema, updateKnowledgeArticleSchema } from "@helpdesk/core";
import { z } from "zod";
import { prisma } from "../db";
import { Prisma } from "../generated/prisma/client";
import { Role } from "../generated/prisma/enums";
import { requireRole } from "../middleware/auth";

// Admin only, for every route. The articles are what the AI answers customers from, so agents don't edit them
export const knowledgeRouter = Router();
knowledgeRouter.use(requireRole(Role.ADMIN));

// Explicit select, and searchVector is never returned (Prisma can't read it anyway)
const articleSelect = { id: true, title: true, content: true, language: true, createdAt: true, updatedAt: true };

function parseId(raw: string | string[]): number {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 1 && id <= 2_147_483_647 ? id : -1;
}

knowledgeRouter.get("/", async (_req, res) => {
  const articles = await prisma.knowledgeArticle.findMany({
    select: articleSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  res.json(articles);
});

knowledgeRouter.post("/", async (req, res) => {
  const parsed = createKnowledgeArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors });
    return;
  }
  const article = await prisma.knowledgeArticle.create({ data: parsed.data, select: articleSelect });
  res.status(201).json(article);
});

knowledgeRouter.patch("/:id", async (req, res) => {
  const parsed = updateKnowledgeArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors });
    return;
  }
  try {
    const article = await prisma.knowledgeArticle.update({
      where: { id: parseId(req.params.id) },
      data: parsed.data,
      select: articleSelect,
    });
    res.json(article);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    throw err;
  }
});

// Hard delete. Replies the AI wrote from it keep their text and only lose the "Based on" link (the foreign key sets it null)
knowledgeRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.knowledgeArticle.delete({ where: { id: parseId(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    throw err;
  }
});
