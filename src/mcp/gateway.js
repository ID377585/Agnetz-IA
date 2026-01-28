import http from "node:http";
import path from "node:path";
import { createMcpLogger } from "./logger.js";
import { createOllamaConnector } from "./connectors/ollama.js";
import { createNotionConnector } from "./connectors/notion.js";
import { createTelegramConnector } from "./connectors/telegram.js";
import { createChromeConnector } from "./connectors/chrome.js";
import { requireBearer } from "./auth.js";

export function createGateway({ dataDir, repo, env } = {}) {
  const finalDataDir = dataDir || path.join(process.cwd(), "data");
  const logger = createMcpLogger({ dataDir: finalDataDir, repo, env });
  const gatewayToken = process.env.MCP_GATEWAY_TOKEN || "";

  const connectors = [
    createOllamaConnector(),
    createNotionConnector(),
    createTelegramConnector(),
    createChromeConnector(),
  ];
  const byName = Object.fromEntries(connectors.map((c) => [c.name, c]));

  function listTools() {
    return connectors.map((c) => ({ name: c.name, info: c.info }));
  }

  function start({ port = 8788 } = {}) {
    const server = http.createServer(async (req, res) => {
      logger.log("mcp.request", { method: req.method, path: req.url });
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, service: "mcp-gateway" }));
        return;
      }
      if (req.url === "/ready") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ready: true }));
        return;
      }
      if (req.url === "/tools") {
        if (!requireBearer(req, gatewayToken)) {
          logger.log("mcp.auth_failed", { path: req.url });
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ tools: listTools() }));
        return;
      }
      if (req.url === "/run" && req.method === "POST") {
        if (!requireBearer(req, gatewayToken)) {
          logger.log("mcp.auth_failed", { path: req.url });
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            const payload = JSON.parse(body || "{}");
            const { connector, action, input } = payload;
            const impl = byName[connector];
            if (!impl) throw new Error(`Unknown connector: ${connector}`);
            logger.log("mcp.run", { connector, action });
            const out = await impl.run(action, input || {});
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, output: out }));
          } catch (err) {
            logger.log("mcp.error", { error: String(err?.message || err) });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
          }
        });
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
    });

    server.listen(port, "0.0.0.0", () => {
      logger.log("mcp.start", { port });
      // eslint-disable-next-line no-console
      console.log(`MCP gateway on http://0.0.0.0:${port}`);
    });
  }

  return { start };
}
