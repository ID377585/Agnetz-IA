import { getSecret } from "../auth.js";

export function createNotionConnector() {
  const baseUrl = "https://api.notion.com/v1";
  const version = process.env.MCP_NOTION_VERSION || "2022-06-28";

  return {
    name: "notion",
    info: { baseUrl, version },
    async run(action, input) {
      const token = getSecret("MCP_NOTION_TOKEN");
      if (!token) {
        throw new Error("notion: MCP_NOTION_TOKEN not set");
      }
      if (action === "search") {
        const res = await fetch(`${baseUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Notion-Version": version,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: input.query || "" }),
        });
        if (!res.ok) {
          throw new Error(`notion: ${res.status} ${await res.text()}`);
        }
        return await res.json();
      }
      throw new Error(`notion: unsupported action ${action}`);
    },
  };
}
