export function getSecret(name) {
  return process.env[name] || "";
}

export function requireSecret(name) {
  const v = getSecret(name);
  if (!v) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return v;
}

export function requireBearer(req, token) {
  if (!token) return true;
  const header = req.headers?.authorization || "";
  const expected = `Bearer ${token}`;
  return header === expected;
}

export function redact(value) {
  if (!value) return "";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}
