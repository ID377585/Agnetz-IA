import { getSecret } from "../auth.js";

export function createTelegramConnector() {
  return {
    name: "telegram",
    info: { baseUrl: "https://api.telegram.org" },
    async run(action, input) {
      const token = getSecret("MCP_TELEGRAM_TOKEN");
      if (!token) {
        throw new Error("telegram: MCP_TELEGRAM_TOKEN not set");
      }
      const baseUrl = `https://api.telegram.org/bot${token}`;
      if (action === "sendMessage") {
        const res = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: input.chat_id,
            text: input.text || "",
            parse_mode: input.parse_mode,
          }),
        });
        if (!res.ok) {
          throw new Error(`telegram: ${res.status} ${await res.text()}`);
        }
        return await res.json();
      }
      if (action === "getUpdates") {
        const params = new URLSearchParams();
        if (input?.offset) params.set("offset", String(input.offset));
        if (input?.limit) params.set("limit", String(input.limit));
        if (input?.timeout) params.set("timeout", String(input.timeout));
        if (input?.allowed_updates) {
          params.set("allowed_updates", JSON.stringify(input.allowed_updates));
        }
        const res = await fetch(`${baseUrl}/getUpdates?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`telegram: ${res.status} ${await res.text()}`);
        }
        return await res.json();
      }
      throw new Error(`telegram: unsupported action ${action}`);
    },
  };
}
