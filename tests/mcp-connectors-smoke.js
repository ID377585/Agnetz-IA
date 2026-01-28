import assert from "node:assert/strict";

import { createOllamaConnector } from "../src/mcp/connectors/ollama.js";
import { createNotionConnector } from "../src/mcp/connectors/notion.js";
import { createTelegramConnector } from "../src/mcp/connectors/telegram.js";
import { createChromeConnector } from "../src/mcp/connectors/chrome.js";

async function expectThrows(fn, contains) {
  try {
    await fn();
    assert.fail("Esperava erro, mas não lançou");
  } catch (err) {
    const msg = String(err?.message || err);
    if (contains) {
      assert.ok(msg.includes(contains), `Erro inesperado: ${msg}`);
    }
  }
}

async function main() {
  const ollama = createOllamaConnector();
  assert.equal(ollama.name, "ollama");

  const notion = createNotionConnector();
  await expectThrows(
    () => notion.run("search", { query: "teste" }),
    "MCP_NOTION_TOKEN"
  );

  const telegram = createTelegramConnector();
  await expectThrows(
    () => telegram.run("getUpdates", {}),
    "MCP_TELEGRAM_TOKEN"
  );

  const chrome = createChromeConnector();
  const status = await chrome.run("status", {});
  assert.equal(status.ok, false);
  await expectThrows(
    () => chrome.run("navigate", { url: "https://example.com" }),
    "MCP_CHROME_WS"
  );

  console.log("MCP smoke ok ✅");
}

main().catch((err) => {
  console.error("MCP smoke falhou ❌");
  console.error(err?.message || err);
  process.exit(1);
});
