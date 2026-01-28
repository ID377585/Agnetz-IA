export function createChromeConnector() {
  const wsUrl = process.env.MCP_CHROME_WS || "";

  return {
    name: "chrome",
    info: { wsUrl },
    async run(action, input) {
      // Placeholder: in MVP we just validate WS URL.
      // Full CDP implementation would use a WebSocket client.
      if (!wsUrl) {
        throw new Error("chrome: MCP_CHROME_WS not set");
      }
      if (action === "status") {
        return { ok: true, ws: wsUrl };
      }
      throw new Error(`chrome: unsupported action ${action}`);
    },
  };
}
