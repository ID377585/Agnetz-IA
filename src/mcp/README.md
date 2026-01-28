# MCP Gateway (MVP)

HTTP gateway that exposes a small set of connector tools with a single auth pattern and JSONL logs.

## Start
```bash
MCP_GATEWAY_TOKEN=change-me MCP_PORT=8788 node ./mcp-gateway.js
```

## Endpoints
- `GET /health` -> liveness
- `GET /ready` -> readiness
- `GET /tools` -> list connectors (requires auth)
- `POST /run` -> execute connector action (requires auth)

## Auth
If `MCP_GATEWAY_TOKEN` is set, every request to `/tools` and `/run` must include:
```
Authorization: Bearer <token>
```

## Connectors
Environment variables:
- `MCP_GATEWAY_URL` (client; default `http://localhost:8788`)
- `MCP_OLLAMA_URL` (default `http://localhost:11434`)
- `MCP_OLLAMA_MODEL` (default `mistral`)
- `MCP_NOTION_TOKEN`
- `MCP_NOTION_VERSION` (default `2022-06-28`)
- `MCP_TELEGRAM_TOKEN`
- `MCP_CHROME_WS` (Chrome DevTools WS URL)

Actions:
- `ollama`: `chat`
- `notion`: `search`, `createPage`, `updatePage`, `appendBlocks`
- `telegram`: `sendMessage`, `getUpdates`
- `chrome`: `status`, `navigate`, `screenshot`, `evaluate`, `content`

## Logs
JSONL logs at `data/mcp.log`:
- `run_id`, `repo`, `env`, `event`, `ts`

## Example
```bash
curl -s -X POST http://localhost:8788/run \
  -H "Authorization: Bearer $MCP_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"connector":"ollama","action":"chat","input":{"messages":[{"role":"user","content":"hello"}]}}'
```

## Exemplos de payload (POST /run)

### Notion: createPage
```json
{
  "connector": "notion",
  "action": "createPage",
  "input": {
    "parent": { "database_id": "db-id" },
    "properties": {
      "Name": { "title": [{ "text": { "content": "Página teste" } }] }
    }
  }
}
```

### Notion: updatePage
```json
{
  "connector": "notion",
  "action": "updatePage",
  "input": {
    "page_id": "page-id",
    "properties": {
      "Status": { "select": { "name": "Done" } }
    }
  }
}
```

### Notion: appendBlocks
```json
{
  "connector": "notion",
  "action": "appendBlocks",
  "input": {
    "block_id": "block-id",
    "children": [
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "type": "text", "text": { "content": "Olá Notion" } }]
        }
      }
    ]
  }
}
```

### Telegram: getUpdates
```json
{
  "connector": "telegram",
  "action": "getUpdates",
  "input": { "offset": 0, "limit": 10, "timeout": 0 }
}
```

### Chrome: navigate
```json
{
  "connector": "chrome",
  "action": "navigate",
  "input": { "url": "https://example.com" }
}
```

### Chrome: screenshot
```json
{
  "connector": "chrome",
  "action": "screenshot",
  "input": {}
}
```

### Chrome: evaluate
```json
{
  "connector": "chrome",
  "action": "evaluate",
  "input": { "expression": "document.title" }
}
```
