import { WebSocket } from "ws";

export function createChromeConnector() {
  const wsUrl = process.env.MCP_CHROME_WS || "";

  async function withCdp(fn) {
    if (!wsUrl) {
      throw new Error("chrome: MCP_CHROME_WS not set");
    }
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 0;

    const ready = new Promise((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg.id && pending.has(msg.id)) {
          const { resolve, reject } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || "CDP error"));
          else resolve(msg.result);
        }
      } catch {
        // ignore
      }
    });

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const callId = ++id;
        pending.set(callId, { resolve, reject });
        ws.send(JSON.stringify({ id: callId, method, params }));
      });
    }

    await ready;
    try {
      return await fn(send);
    } finally {
      ws.close();
    }
  }

  return {
    name: "chrome",
    info: { wsUrl },
    async run(action, input) {
      if (action === "status") {
        return { ok: !!wsUrl, ws: wsUrl };
      }

      if (action === "navigate") {
        const url = input?.url;
        if (!url) throw new Error("chrome: missing url");
        return withCdp(async (send) => {
          await send("Page.enable");
          const res = await send("Page.navigate", { url });
          return { ok: true, frameId: res.frameId };
        });
      }

      if (action === "screenshot") {
        return withCdp(async (send) => {
          await send("Page.enable");
          await send("Runtime.enable");
          const res = await send("Page.captureScreenshot", { format: "png" });
          return { ok: true, data: res.data }; // base64
        });
      }

      if (action === "evaluate") {
        const expression = input?.expression;
        if (!expression) throw new Error("chrome: missing expression");
        return withCdp(async (send) => {
          await send("Runtime.enable");
          const res = await send("Runtime.evaluate", {
            expression,
            returnByValue: true,
          });
          return { ok: true, result: res.result?.value };
        });
      }

      if (action === "content") {
        return withCdp(async (send) => {
          await send("Runtime.enable");
          const res = await send("Runtime.evaluate", {
            expression: "document.documentElement.outerHTML",
            returnByValue: true,
          });
          return { ok: true, html: res.result?.value };
        });
      }

      throw new Error(`chrome: unsupported action ${action}`);
    },
  };
}
