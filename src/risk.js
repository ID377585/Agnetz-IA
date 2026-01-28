import fs from "node:fs";
import path from "node:path";

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

function appendJsonLine(filePath, obj) {
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`, "utf-8");
}

export function evaluateRisk({ action, env, policyPath }) {
  const policy = safeReadJson(policyPath, {});
  const envPolicy = (policy.env_policies || {})[env] || {};

  const actions = {
    ...(policy.actions || {}),
    ...(envPolicy.actions || {}),
  };

  const defaultRisk = envPolicy.default_risk || policy.default_risk || "medium";
  const actionPolicy = actions[action] || {};

  const risk = actionPolicy.risk || defaultRisk;
  const safeguards = {
    ...(policy.safeguards || {}),
  }[risk] || {};

  return {
    risk,
    plan_required: actionPolicy.plan_required ?? safeguards.plan_required ?? false,
    diff_required: actionPolicy.diff_required ?? safeguards.diff_required ?? false,
    checks_required: actionPolicy.checks_required ?? safeguards.checks_required ?? false,
    policy,
  };
}

export function logDecision({
  policyPath,
  action,
  env,
  runId,
  inputs,
  outputs,
  status,
  reason,
} = {}) {
  const policy = safeReadJson(policyPath, {});
  const dest = policy.audit?.destination || "data/decision-audit.log";
  const auditPath = path.join(process.cwd(), dest);

  appendJsonLine(auditPath, {
    ts: new Date().toISOString(),
    run_id: runId,
    env,
    action,
    inputs: inputs ?? null,
    outputs: outputs ?? null,
    status: status ?? "planned",
    reason: reason ?? null,
  });
}
