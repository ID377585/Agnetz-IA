import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

export const agentRouter = Router();

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

type Task = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  meta?: Record<string, unknown>;
};

function readTasks(): Task[] {
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    const raw = fs.readFileSync(TASKS_FILE, "utf-8");
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function writeTasks(tasks: Task[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

agentRouter.get("/tasks", (_req, res) => {
  const tasks = readTasks();
  res.json({ ok: true, tasks });
});

agentRouter.post("/tasks", (req, res) => {
  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    type: String(req.body?.type || "manual"),
    status: String(req.body?.status || "queued"),
    created_at: now,
    updated_at: now,
    meta: req.body?.meta || {},
  };
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  res.json({ ok: true, task });
});

agentRouter.patch("/tasks/:id", (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, error: "not_found" });
  tasks[idx] = {
    ...tasks[idx],
    status: String(req.body?.status || tasks[idx].status),
    updated_at: new Date().toISOString(),
  };
  writeTasks(tasks);
  res.json({ ok: true, task: tasks[idx] });
});

agentRouter.post("/actions/:type", (req, res) => {
  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    type: String(req.params.type),
    status: "queued",
    created_at: now,
    updated_at: now,
    meta: req.body || {},
  };
  const tasks = readTasks();
  tasks.push(task);
  // Simula execução rápida
  task.status = "completed";
  task.updated_at = new Date().toISOString();
  writeTasks(tasks);
  res.json({ ok: true, task });
});

agentRouter.post("/attachments", upload.array("files", 20), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const payload = files.map((f) => ({
    id: f.filename,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    path: f.path,
  }));
  res.json({ ok: true, files: payload });
});
