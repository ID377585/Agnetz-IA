export function getGatewayUrl() {
  return process.env.MCP_GATEWAY_URL || "http://localhost:8788";
}

function authHeaders() {
  const token = process.env.MCP_GATEWAY_TOKEN || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listTools() {
  const baseUrl = getGatewayUrl();
  const res = await fetch(`${baseUrl}/tools`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`mcp: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

export async function runTool(connector, action, input = {}) {
  const baseUrl = getGatewayUrl();
  const res = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ connector, action, input }),
  });
  if (!res.ok) {
    throw new Error(`mcp: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}
