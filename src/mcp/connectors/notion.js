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
      if (action === "createPage") {
        const parent = input?.parent;
        if (!parent) {
          throw new Error("notion: missing parent");
        }
        const payload = {
          parent,
          properties: input?.properties || {},
          children: input?.children || [],
        };
        const res = await fetch(`${baseUrl}/pages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Notion-Version": version,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`notion: ${res.status} ${await res.text()}`);
        }
        return await res.json();
      }
      if (action === "updatePage") {
        const pageId = input?.page_id;
        if (!pageId) {
          throw new Error("notion: missing page_id");
        }
        const payload = {
          properties: input?.properties || {},
          archived: input?.archived,
        };
        const res = await fetch(`${baseUrl}/pages/${pageId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Notion-Version": version,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`notion: ${res.status} ${await res.text()}`);
        }
        return await res.json();
      }
      if (action === "appendBlocks") {
        const blockId = input?.block_id;
        if (!blockId) {
          throw new Error("notion: missing block_id");
        }
        const payload = { children: input?.children || [] };
        const res = await fetch(`${baseUrl}/blocks/${blockId}/children`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Notion-Version": version,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
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
