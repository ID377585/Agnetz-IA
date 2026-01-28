import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function createMcpLogger({ dataDir, repo, env } = {}) {
  const runId = crypto.randomUUID();
  fs.mkdirSync(dataDir, { recursive: true });
  const logFile = path.join(dataDir, "mcp.log");

  function log(event, fields = {}) {
    const payload = {
      ts: new Date().toISOString(),
      run_id: runId,
      repo,
      env,
      event,
      ...fields,
    };
    fs.appendFileSync(logFile, `${JSON.stringify(payload)}\n`, "utf-8");
  }

  return { log, runId };
}
