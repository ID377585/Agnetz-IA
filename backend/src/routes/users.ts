import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const usersRouter = Router();

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).optional()
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional()
});

usersRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users);
});

usersRouter.get("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(user);
});

usersRouter.post("/users", async (req, res) => {
  const parsed = createSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  }
  const { email, name } = parsed.data;

  const created = await prisma.user.create({
    data: { email, name: name || null }
  });

  res.status(201).json(created);
});

usersRouter.put("/users/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  }
  const { email, name } = parsed.data;
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { email, name: name || null }
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "not_found" });
  }
});

usersRouter.delete("/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "not_found" });
  }
});
