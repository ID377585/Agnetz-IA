import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { execSync } from "node:child_process";

const DEFAULT_METRICS = {
  version: 1,
  runs: {
    total: 0,
    success: 0,
    failure: 0,
    duration_ms_sum: 0,
  },
  steps: {},
  failures_by_category: {},
};

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const txt = fs.readFileSync(filePath, "utf-8").trim();
    if (!txt) return fallback;
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function appendJsonLine(filePath, obj) {
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`, "utf-8");
}

function detectCommit(rootDir) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: rootDir, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

export function createObserver({ dataDir, repo, env } = {}) {
  const runId = crypto.randomUUID();
  const rootDir = process.cwd();
  const logFile = path.join(dataDir, "observability.log");
  const metricsFile = path.join(dataDir, "metrics.json");
  const commit = detectCommit(rootDir);

  let metrics = safeReadJson(metricsFile, DEFAULT_METRICS);
  let ended = false;

  function log(event, fields = {}) {
    appendJsonLine(logFile, {
      ts: new Date().toISOString(),
      run_id: runId,
      repo,
      env,
      commit,
      event,
      ...fields,
    });
  }

  function startRun({ command, category }) {
    metrics.runs.total += 1;
    safeWriteJson(metricsFile, metrics);
    log("run.start", { command, category });
    return { runId, startMs: Date.now(), command, category };
  }

  function endRun({ status, durationMs, category }) {
    if (ended) return;
    ended = true;

    if (status === "success") metrics.runs.success += 1;
    else metrics.runs.failure += 1;

    if (typeof durationMs === "number") {
      metrics.runs.duration_ms_sum += durationMs;
    }

    if (status !== "success" && category) {
      metrics.failures_by_category[category] =
        (metrics.failures_by_category[category] || 0) + 1;
    }

    safeWriteJson(metricsFile, metrics);
    log("run.end", { status, duration_ms: durationMs ?? null, category });
  }

  function recordStep({ name, durationMs, status = "success" }) {
    const entry = metrics.steps[name] || {
      count: 0,
      success: 0,
      failure: 0,
      duration_ms_sum: 0,
    };
    entry.count += 1;
    entry.duration_ms_sum += durationMs || 0;
    if (status === "success") entry.success += 1;
    else entry.failure += 1;
    metrics.steps[name] = entry;
    safeWriteJson(metricsFile, metrics);
    log("step", { step: name, status, duration_ms: durationMs ?? null });
  }

  function snapshot() {
    return safeReadJson(metricsFile, DEFAULT_METRICS);
  }

  function startServer({ port = 8787 } = {}) {
    const server = http.createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, service: "agnetz-ia" }));
        return;
      }
      if (req.url === "/ready") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ready: true }));
        return;
      }
      if (req.url === "/metrics") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(snapshot()));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
    });

    server.listen(port, "0.0.0.0", () => {
      log("obs.server.start", { port });
      // eslint-disable-next-line no-console
      console.log(`Observability server on http://0.0.0.0:${port}`);
    });
    return server;
  }

  return { startRun, endRun, recordStep, log, startServer };
}
