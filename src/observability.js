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

function toPrometheus(metrics) {
  const lines = [];

  const runs = metrics.runs || {};
  const total = runs.total || 0;
  const success = runs.success || 0;
  const failure = runs.failure || 0;
  const sum = runs.duration_ms_sum || 0;
  const avg = total > 0 ? Math.round(sum / total) : 0;

  lines.push("# HELP agnetz_runs_total Total runs");
  lines.push("# TYPE agnetz_runs_total counter");
  lines.push(`agnetz_runs_total ${total}`);
  lines.push("# HELP agnetz_runs_success Total successful runs");
  lines.push("# TYPE agnetz_runs_success counter");
  lines.push(`agnetz_runs_success ${success}`);
  lines.push("# HELP agnetz_runs_failure Total failed runs");
  lines.push("# TYPE agnetz_runs_failure counter");
  lines.push(`agnetz_runs_failure ${failure}`);
  lines.push("# HELP agnetz_runs_duration_ms_sum Total run duration in ms");
  lines.push("# TYPE agnetz_runs_duration_ms_sum counter");
  lines.push(`agnetz_runs_duration_ms_sum ${sum}`);
  lines.push("# HELP agnetz_runs_duration_ms_avg Average run duration in ms");
  lines.push("# TYPE agnetz_runs_duration_ms_avg gauge");
  lines.push(`agnetz_runs_duration_ms_avg ${avg}`);

  const steps = metrics.steps || {};
  lines.push("# HELP agnetz_step_count Total step executions");
  lines.push("# TYPE agnetz_step_count counter");
  lines.push("# HELP agnetz_step_duration_ms_sum Total step duration in ms");
  lines.push("# TYPE agnetz_step_duration_ms_sum counter");
  lines.push("# HELP agnetz_step_failure Total step failures");
  lines.push("# TYPE agnetz_step_failure counter");
  for (const [name, entry] of Object.entries(steps)) {
    const safe = String(name).replace(/[^a-zA-Z0-9:_-]/g, "_");
    lines.push(`agnetz_step_count{step="${safe}"} ${entry.count || 0}`);
    lines.push(
      `agnetz_step_duration_ms_sum{step="${safe}"} ${
        entry.duration_ms_sum || 0
      }`
    );
    lines.push(`agnetz_step_failure{step="${safe}"} ${entry.failure || 0}`);
  }

  const failures = metrics.failures_by_category || {};
  lines.push("# HELP agnetz_failures_by_category Failures by category");
  lines.push("# TYPE agnetz_failures_by_category counter");
  for (const [cat, count] of Object.entries(failures)) {
    const safe = String(cat).replace(/[^a-zA-Z0-9:_-]/g, "_");
    lines.push(`agnetz_failures_by_category{category="${safe}"} ${count || 0}`);
  }

  return `${lines.join("\n")}\n`;
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
      if (req.url === "/metrics.prom") {
        res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
        res.end(toPrometheus(snapshot()));
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

  return { startRun, endRun, recordStep, log, startServer, runId };
}
